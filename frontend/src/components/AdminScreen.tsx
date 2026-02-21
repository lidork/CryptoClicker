import { useState, useEffect, useCallback } from 'react'
import { JsonRpcSigner, Contract, formatEther, ZeroAddress } from 'ethers'
import { toast } from 'react-toastify'
import { GameItemABI, MarketplaceABI, ClickerTokenABI } from '../abis/contractABIs'
import { GAME_ITEM_ADDRESS, MARKETPLACE_ADDRESS, CLICKER_TOKEN_ADDRESS, VALIDATOR_ADDRESS, KNOWN_ADDRESS_LABELS } from '../constants'
import type { LeaderboardEntry } from '../types'

interface AdminScreenProps {
  signer: JsonRpcSigner | null
  userAddress: string | null
  tokenBalance: string
  onRefreshBalance: () => Promise<void>
  onToggleDebug: () => void
  showDebug: boolean
}

export function AdminScreen({
  signer,
  userAddress,
  tokenBalance,
  onRefreshBalance,
  onToggleDebug,
  showDebug
}: AdminScreenProps) {
  const [gameItemFunds, setGameItemFunds] = useState<string>('0')
  const [marketplaceFees, setMarketplaceFees] = useState<string>('0')
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false)
  const [userNonce, setUserNonce] = useState<number>(0)
  const [platformFeePercentage, setPlatformFeePercentage] = useState<number>(0)
  const [trueLeaderboard, setTrueLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)

  // Fetch accumulated funds
  const fetchAccumulatedFunds = useCallback(async () => {
    if (!signer) return

    try {
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const marketplaceContract = new Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer)

      const [funds, fees, feePercent] = await Promise.all([
        gameItemContract.getAccumulatedFunds(),
        marketplaceContract.getAccumulatedFees(),
        marketplaceContract.PLATFORM_FEE_PERCENTAGE()
      ])

      setGameItemFunds(formatEther(funds))
      setMarketplaceFees(formatEther(fees))
      setPlatformFeePercentage(Number(feePercent))
    } catch (error) {
      console.error('Error fetching accumulated funds:', error)
    }
  }, [signer])

  // Fetch validator info
  const fetchValidatorInfo = useCallback(async () => {
    if (!signer || !userAddress) return

    try {
      const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, signer)
      const nonce = await tokenContract.getMintNonce(userAddress)
      setUserNonce(Number(nonce))
    } catch (error) {
      console.error('Error fetching validator info:', error)
    }
  }, [signer, userAddress])

  useEffect(() => {
    if (signer && userAddress) {
      fetchAccumulatedFunds()
      fetchValidatorInfo()
    }
  }, [signer, userAddress, fetchAccumulatedFunds, fetchValidatorInfo])

  // Withdraw from GameItem contract
  const withdrawGameItemFunds = async () => {
    if (!signer) {
      toast.error('Please connect your wallet')
      return
    }

    setIsWithdrawing(true)
    try {
      const contract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, signer)
      const tx = await contract.withdrawFunds()
      
      toast.info('Transaction submitted... Waiting for confirmation')
      await tx.wait()
      
      toast.success(`Successfully withdrew ${gameItemFunds} CLK from GameItem contract!`)
      await fetchAccumulatedFunds()
      await onRefreshBalance()
    } catch (error: unknown) {
      console.error('Error withdrawing GameItem funds:', error)
      const errorMessage = error && typeof error === 'object' && 'reason' in error ? (error as { reason: string }).reason : 'Failed to withdraw funds'
      toast.error(errorMessage)
    } finally {
      setIsWithdrawing(false)
    }
  }

  // Withdraw from Marketplace contract
  const withdrawMarketplaceFees = async () => {
    if (!signer) {
      toast.error('Please connect your wallet')
      return
    }

    setIsWithdrawing(true)
    try {
      const contract = new Contract(MARKETPLACE_ADDRESS, MarketplaceABI, signer)
      const tx = await contract.withdrawFees()
      
      toast.info('Transaction submitted... Waiting for confirmation')
      await tx.wait()
      
      toast.success(`Successfully withdrew ${marketplaceFees} CLK from Marketplace contract!`)
      await fetchAccumulatedFunds()
      await onRefreshBalance()
    } catch (error: unknown) {
      console.error('Error withdrawing Marketplace fees:', error)
      const errorMessage = error && typeof error === 'object' && 'reason' in error ? (error as { reason: string }).reason : 'Failed to withdraw fees'
      toast.error(errorMessage)
    } finally {
      setIsWithdrawing(false)
    }
  }

  // Refresh all data
  const refreshAll = async () => {
    await fetchAccumulatedFunds()
    await fetchValidatorInfo()
    await onRefreshBalance()
    toast.success('Refreshed all admin data')
  }

  const fetchTrueLeaderboard = useCallback(async () => {
    if (!signer) return

    setIsLoadingLeaderboard(true)
    try {
      const provider = signer.provider
      if (!provider) return

      const tokenContract = new Contract(CLICKER_TOKEN_ADDRESS, ClickerTokenABI, provider)
      const gameItemContract = new Contract(GAME_ITEM_ADDRESS, GameItemABI, provider)
      const [gameItemOwner] = await Promise.all([
        gameItemContract.owner(),
        //marketplaceContract.owner()
      ])

      const addressLabels = new Map<string, string>(
        Object.entries(KNOWN_ADDRESS_LABELS)
      )
      if (gameItemOwner) {
        addressLabels.set(gameItemOwner.toLowerCase(), "Game Owner")
      }
      if (ZeroAddress) {
        addressLabels.set(ZeroAddress.toLowerCase(), "Burned Tokens (Zero Address)")
      }

      const filter = tokenContract.filters.Transfer()
      const events = await tokenContract.queryFilter(filter, 0)

      const balances: Record<string, bigint> = {}

      events.forEach((event) => {
        // @ts-expect-error Ethers args
        const from = event.args[0]
        // @ts-expect-error Ethers args
        const to = event.args[1]
        // @ts-expect-error Ethers args
        const value = event.args[2]

        if (from !== ZeroAddress) {
          balances[from] = (balances[from] || 0n) - value
        }
        balances[to] = (balances[to] || 0n) + value
      })

      const sortedList = Object.entries(balances)
        .map(([addr, bal]) => ({
          address: addr,
          balance: parseFloat(formatEther(bal))
        }))
        .filter((item) => item.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .map(item => ({
          address: item.address,
          balance: item.balance.toFixed(2),
          label: addressLabels.get(item.address.toLowerCase())
        }))

      setTrueLeaderboard(sortedList)
    } catch (error) {
      console.error('Error fetching true leaderboard:', error)
      toast.error('Failed to load true leaderboard')
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }, [signer])

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        backgroundColor: '#1a1a1a', 
        padding: '20px', 
        borderRadius: '8px',
        border: '2px solid #646cff',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#646cff', marginTop: 0 }}>🔐 Admin Panel</h2>
        <p style={{ color: '#888', fontSize: '14px' }}>Owner-only functions for managing contract revenue</p>
      </div>

      {/* Revenue Withdrawal Section */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* GameItem Funds */}
        <div style={{ 
          backgroundColor: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <h3 style={{ marginTop: 0, color: '#fff' }}>🎮 GameItem Revenue</h3>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '15px' }}>
            Accumulated funds from lootbox and agent purchases
          </p>
          <div style={{ 
            backgroundColor: '#0a0a0a', 
            padding: '15px', 
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4ade80' }}>
              {parseFloat(gameItemFunds).toFixed(2)} CLK
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Available for withdrawal
            </div>
          </div>
          <button
            onClick={withdrawGameItemFunds}
            disabled={isWithdrawing || parseFloat(gameItemFunds) === 0}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              backgroundColor: parseFloat(gameItemFunds) > 0 ? '#4ade80' : '#333',
              color: parseFloat(gameItemFunds) > 0 ? '#000' : '#666',
              cursor: parseFloat(gameItemFunds) > 0 && !isWithdrawing ? 'pointer' : 'not-allowed',
              fontWeight: 'bold'
            }}
          >
            {isWithdrawing ? '⏳ Withdrawing...' : `💰 Withdraw GameItem Funds`}
          </button>
        </div>

        {/* Marketplace Fees */}
        <div style={{ 
          backgroundColor: '#1a1a1a', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <h3 style={{ marginTop: 0, color: '#fff' }}>🛍️ Marketplace Fees</h3>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '15px' }}>
            {platformFeePercentage}% platform fee on all marketplace transfers
          </p>
          <div style={{ 
            backgroundColor: '#0a0a0a', 
            padding: '15px', 
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4ade80' }}>
              {parseFloat(marketplaceFees).toFixed(2)} CLK
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Available for withdrawal
            </div>
          </div>
          <button
            onClick={withdrawMarketplaceFees}
            disabled={isWithdrawing || parseFloat(marketplaceFees) === 0}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              backgroundColor: parseFloat(marketplaceFees) > 0 ? '#4ade80' : '#333',
              color: parseFloat(marketplaceFees) > 0 ? '#000' : '#666',
              cursor: parseFloat(marketplaceFees) > 0 && !isWithdrawing ? 'pointer' : 'not-allowed',
              fontWeight: 'bold'
            }}
          >
            {isWithdrawing ? '⏳ Withdrawing...' : `💰 Withdraw Platform Fees`}
          </button>
        </div>
      </div>

      {/* Total Revenue Summary */}
      <div style={{ 
        backgroundColor: '#1a1a1a', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #333',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, color: '#fff' }}>📊 Total Revenue Summary</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
          <div>
            <div style={{ color: '#888', fontSize: '14px' }}>Total Withdrawable</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4ade80' }}>
              {(parseFloat(gameItemFunds) + parseFloat(marketplaceFees)).toFixed(2)} CLK
            </div>
          </div>
          <div>
            <div style={{ color: '#888', fontSize: '14px' }}>Your Current Balance</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#646cff' }}>
              {parseFloat(tokenBalance).toFixed(2)} CLK
            </div>
          </div>
        </div>
      </div>

      {/* True Leaderboard */}
      <div style={{
        backgroundColor: '#1a1a1a',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #333',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ marginTop: 0, color: '#fff' }}>📋 True Leaderboard</h3>
          <button
            onClick={fetchTrueLeaderboard}
            disabled={isLoadingLeaderboard}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1a1a1a',
              border: '1px solid #646cff',
              fontWeight: 'bold'
            }}
          >
            {isLoadingLeaderboard ? '⏳ Loading...' : '🔄 Load'}
          </button>
        </div>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '10px' }}>
          Includes all wallets with balances, including system addresses excluded from the public leaderboard.
        </p>
        {trueLeaderboard.length === 0 ? (
          <div style={{ color: '#666', fontSize: '14px' }}>No data loaded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
            {trueLeaderboard.map((entry, index) => {
              const displayName = entry.label
                ? entry.label
                : `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`
              return (
                <div
                  key={entry.address}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: index === 0 ? 'rgba(255, 215, 0, 0.2)' : '#333',
                    borderRadius: '6px',
                    border: index === 0 ? '1px solid gold' : 'none'
                  }}
                >
                  <span>#{index + 1} {displayName}</span>
                  <span style={{ fontWeight: 'bold' }}>{entry.balance} CLK</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Debug Section */}
      <div style={{ 
        backgroundColor: '#1a1a1a', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #333',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0, color: '#fff' }}>🛠️ Debug & Developer Tools</h3>
        
        <button
          onClick={onToggleDebug}
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            backgroundColor: showDebug ? '#ef4444' : '#646cff',
            marginBottom: '15px',
            fontWeight: 'bold'
          }}
        >
          {showDebug ? '🔴 Hide Debug Menu' : '🟢 Show Debug Menu'}
        </button>

        {showDebug && (
          <div style={{ 
            backgroundColor: '#0a0a0a', 
            padding: '15px', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#888' }}>Connected Address:</strong>
              <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: '12px' }}>
                {userAddress}
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#888' }}>Validator Address:</strong>
              <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: '12px' }}>
                {VALIDATOR_ADDRESS}
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#888' }}>Your Mint Nonce:</strong>
              <div style={{ color: '#fff', fontFamily: 'monospace' }}>
                {userNonce}
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#888' }}>Contract Addresses:</strong>
              <div style={{ fontSize: '12px', fontFamily: 'monospace', marginTop: '5px' }}>
                <div style={{ color: '#4ade80' }}>Token: {CLICKER_TOKEN_ADDRESS}</div>
                <div style={{ color: '#60a5fa' }}>GameItem: {GAME_ITEM_ADDRESS}</div>
                <div style={{ color: '#f59e0b' }}>Marketplace: {MARKETPLACE_ADDRESS}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={refreshAll}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: '16px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #646cff',
            fontWeight: 'bold'
          }}
        >
          🔄 Refresh All Data
        </button>
      </div>
    </div>
  )
}
