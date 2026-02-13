import { useState, useCallback } from 'react'
import { Contract, formatEther, parseEther } from 'ethers'
import { toast } from 'react-toastify'
import { ClickerTokenABI, GameItemABI } from '../abis/contractABIs'
import { CLICKER_TOKEN_ADDRESS, GAME_ITEM_ADDRESS, SHOP_ITEMS } from '../constants'
import { JsonRpcSigner } from 'ethers'
import type { ShopItem } from '../types'

export function useShopPurchasing(signer: JsonRpcSigner | null, userAddress: string | null, tokenBalance: string) {
  const [purchasingItemUri, setPurchasingItemUri] = useState<string | null>(null)
  const [dynamicPrices, setDynamicPrices] = useState<Record<string, string>>({})

  const fetchShopPrices = useCallback(async () => {
    if (!signer) return
    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const prices: Record<string, string> = {}

      for (const item of SHOP_ITEMS) {
        const basePriceWei = parseEther(item.price.toString())
        const currentPriceWei = await gameItemContract.getDynamicPrice(item.uri, basePriceWei)
        prices[item.uri] = formatEther(currentPriceWei)
      }
      setDynamicPrices(prices)
    } catch (e) {
      console.warn("Error fetching dynamic prices", e)
    }
  }, [signer])

  const buyShopItem = useCallback(async (
    itemUri: string,
    fetchBalance: () => Promise<void>,
    fetchInventory: () => Promise<void>
  ) => {
    if (!signer || !userAddress) {
      toast.error("Connect wallet first!")
      return
    }
    
    const item = SHOP_ITEMS.find(i => i.uri === itemUri) as ShopItem | undefined
    if (!item) return

    const livePriceStr = dynamicPrices[itemUri] || item.price.toString()
    const livePrice = parseFloat(livePriceStr)
    const currentBalance = parseFloat(tokenBalance)

    if (currentBalance < livePrice) {
      toast.error(`Insufficient funds! Item costs ${livePrice} CLK (Dynamic Price).`)
      return
    }

    try {
      setPurchasingItemUri(itemUri)

      const basePriceWei = parseEther(item.price.toString())
      const livePriceWei = parseEther(livePriceStr)

      const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer)
      const allowance = await tokenContract.allowance(userAddress, GAME_ITEM_ADDRESS)

      if (allowance < livePriceWei) {
        toast.info("Please approve the transaction first...")
        const txApprove = await tokenContract.approve(GAME_ITEM_ADDRESS, livePriceWei)
        await toast.promise(
          txApprove.wait(),
          { pending: "Approving usage of CLK...", success: "Approved!", error: "Approval failed" }
        )
      }

      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)

      const txPromise = async () => {
        const tx = await gameItemContract.mintLootboxItem(userAddress, itemUri, basePriceWei)
        console.log("Mint transaction:", tx.hash)
        const receipt = await tx.wait()
        
        // Extract minted token ID and fetch metadata for toast
        if (receipt && receipt.logs && receipt.logs.length > 0) {
          const iface = gameItemContract.interface
          for (const log of receipt.logs) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const parsed = iface.parseLog(log as any)
              if (parsed && parsed.name === 'Transfer') {
                const tokenId = parsed.args[2]
                try {
                  const itemMeta = await gameItemContract.items(tokenId)
                  const strength = Number(itemMeta.strength)
                  const strengthPercent = (strength / 50) * 100
                  const rarityLabel = strengthPercent > 80 ? '🌟 Epic Strength' : strengthPercent > 60 ? '💎 Rare Strength' : strengthPercent > 40 ? '✨ Uncommon Strength' : '⭐ Common Strength'
                  return { receipt, rarityLabel, strength }
                } catch (e) {
                  console.warn('Could not fetch item strength:', e)
                  return { receipt }
                }
              }
            } catch (parseErr) {
              // Log parsing failed, continue
              console.warn('Failed to parse log:', parseErr)
            }
          }
        }
        
        return { receipt }
      }

      const result = await toast.promise(
        txPromise(),
        {
          pending: `Minting ${item.name}...`,
          success: 'Item Minted!',
          error: 'Minting failed'
        }
      )
      
      // Show customized toast with strength if available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (result && (result as any).rarityLabel) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const successMsg = `${item.name} Minted! ${(result as any).rarityLabel} (${(result as any).strength}/50)`
        toast.success(successMsg, { autoClose: 4000 })
      }

      // Update local balance and refetch
      await fetchShopPrices()
      await fetchInventory()
      await fetchBalance()
    } catch (e: unknown) {
      console.error("Mint failed:", e)
      let msg = "Failed to buy item."
      if (typeof e === 'object' && e !== null) {
        const err = e as { reason?: string; message?: string }
        if (err.reason) msg += ` Reason: ${err.reason}`
        else if (err.message) msg += ` Error: ${err.message}`
      }
      toast.error(msg)
    } finally {
      setPurchasingItemUri(null)
    }
  }, [signer, userAddress, tokenBalance, dynamicPrices, fetchShopPrices])

  return {
    purchasingItemUri,
    dynamicPrices,
    fetchShopPrices,
    buyShopItem
  }
}
