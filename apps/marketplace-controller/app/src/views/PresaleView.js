import React, { useState, useEffect } from 'react'
import { unstable_batchedUpdates as batchedUpdates } from 'react-dom'
import { useAppState, useApi, useConnectedAccount, useNetwork } from '@aragon/api-react'
import { Header, Button } from '@aragon/ui'
import BigNumber from 'bignumber.js'
import { useInterval } from '../hooks/use-interval'
import { Presale as PresaleConstants, Polling } from '../constants'
import Presale from '../screens/Presale'
import NewContribution from '../components/NewContribution'
import NewRefund from '../components/NewRefund'
import { IdentityProvider } from '../components/IdentityManager'
import { PresaleViewContext } from '../context'
import PresaleAbi from '../abi/Presale.json'

export default () => {
  // *****************************
  // background script state
  // *****************************
  const {
    addresses: { presale: presaleAddress },
    presale: {
      state,
      openDate,
      contributionToken: { address },
    },
  } = useAppState()

  // *****************************
  // aragon api
  // *****************************
  const api = useApi()
  const presale = api.external(presaleAddress, PresaleAbi)
  const connectedUser = useConnectedAccount()
  const { type: networkType } = useNetwork()

  // *****************************
  // internal state, also shared through context
  // *****************************
  const [presalePanel, setPresalePanel] = useState(false)
  const [refundPanel, setRefundPanel] = useState(false)

  // *****************************
  // context state
  // *****************************
  const [polledOpenDate, setPolledOpenDate] = useState(openDate)
  const [polledPresaleState, setPolledPresaleState] = useState(state)
  const [userPrimaryCollateralBalance, setUserPrimaryCollateralBalance] = useState(new BigNumber(0))
  const context = {
    openDate: polledOpenDate,
    state: polledPresaleState,
    userPrimaryCollateralBalance: userPrimaryCollateralBalance,
    presalePanel,
    setPresalePanel,
    refundPanel,
    setRefundPanel,
  }

  // *****************************
  // identity handlers
  // *****************************
  const handleResolveLocalIdentity = address => {
    return api.resolveAddressIdentity(address).toPromise()
  }
  const handleShowLocalIdentityModal = address => {
    return api.requestAddressIdentityModification(address).toPromise()
  }

  // watch for a connected user and get its balances
  useEffect(() => {
    const getUserPrimaryCollateralBalance = async () => {
      setUserPrimaryCollateralBalance(new BigNumber(await api.call('balanceOf', connectedUser, address).toPromise()))
    }
    if (connectedUser) {
      getUserPrimaryCollateralBalance()
    }
  }, [connectedUser])

  // polls the start date
  useInterval(async () => {
    let newOpenDate = polledOpenDate
    let newUserPrimaryCollateralBalance = userPrimaryCollateralBalance
    let newPresaleState = polledPresaleState
    // only poll if the openDate is not set yet
    if (openDate === 0) newOpenDate = parseInt(await presale.openDate().toPromise(), 10)
    // only poll if there is a connected user
    if (connectedUser) newUserPrimaryCollateralBalance = new BigNumber(await api.call('balanceOf', connectedUser, address).toPromise())
    // poll presale state
    newPresaleState = Object.values(PresaleConstants.state)[await presale.state().toPromise()]
    // TODO: keep an eye on React 17
    batchedUpdates(() => {
      // only update if values are different
      if (newOpenDate !== polledOpenDate) setPolledOpenDate(newOpenDate)
      if (!newUserPrimaryCollateralBalance.eq(userPrimaryCollateralBalance)) setUserPrimaryCollateralBalance(newUserPrimaryCollateralBalance)
      if (newPresaleState !== polledPresaleState) setPolledPresaleState(newPresaleState)
    })
  }, Polling.DURATION)

  return (
    <PresaleViewContext.Provider value={context}>
      <IdentityProvider onResolve={handleResolveLocalIdentity} onShowLocalIdentityModal={handleShowLocalIdentityModal}>
        <Header
          primary="Marketplace Presale"
          secondary={
            <Button
              disabled={polledPresaleState !== PresaleConstants.state.FUNDING}
              mode="strong"
              label="Buy presale shares"
              onClick={() => setPresalePanel(true)}
            />
          }
        />
        <Presale />
        <NewContribution />
        <NewRefund />
      </IdentityProvider>
    </PresaleViewContext.Provider>
  )
}
