import React, { useContext, useEffect, useState } from 'react'
import styled from 'styled-components'
import { useAppState } from '@aragon/api-react'
import { Box, useTheme, GU } from '@aragon/ui'
import BigNumber from 'bignumber.js'
import subMonths from 'date-fns/subMonths'
import Chart from '../components/Chart'
import { formatBigNumber, toMonthlyAllocation } from '../utils/bn-utils'
import { MainViewContext } from '../context'

export default () => {
  // *****************************
  // background script state
  // *****************************
  const {
    bondedToken: { decimals: tokenDecimals, realSupply },
    collaterals: {
      primaryCollateral: {
        address: primaryCollateralAddress,
        decimals: primaryCollateralDecimals,
        symbol: primaryCollateralSymbol,
        toBeClaimed,
        tap: { rate },
      },
    },
    batches,
    orders,
  } = useAppState()

  const theme = useTheme()

  // *****************************
  // context state
  // *****************************
  const { reserveBalance, price } = useContext(MainViewContext)

  // *****************************
  // internal state
  // *****************************
  // the batch we use to compute trends
  const [trendBatch, setTrendBatch] = useState(null)

  // *****************************
  // effects
  // *****************************
  // update the base batch to compute trends
  useEffect(() => {
    // search the closest batch from (now - 1 month) to create some trends
    const oneMonthAgo = subMonths(new Date(), 1).getTime()
    const trendBatch = batches.reduce(
      (closest, b) => {
        const currentClosest = Math.abs(closest.timestamp - oneMonthAgo)
        const current = Math.abs(b.timestamp - oneMonthAgo)
        return currentClosest < current ? closest : b
      },
      { timestamp: new Date() }
    )
    setTrendBatch(trendBatch)
  }, [batches])

  // *****************************
  // human readable values
  // *****************************
  // numbers
  const numberSuffix = ' ' + primaryCollateralSymbol;
  const adjustedPrice = price ? formatBigNumber(price, 0, { numberSuffix }) : '...'
  const marketCap = price ? price.times(realSupply) : null
  const adjustedMarketCap = price && marketCap ? formatBigNumber(marketCap, primaryCollateralDecimals, { numberSuffix }) : '...'
  const tradingVolume = orders
    // only keep primary collateral orders
    .filter(o => o.collateral === primaryCollateralAddress)
    // keep values
    .map(o => o.value)
    // sum them and tada, you got the trading volume
    .reduce((acc, current) => acc.plus(current), new BigNumber(0))
  const adjustedTradingVolume = formatBigNumber(tradingVolume, primaryCollateralDecimals, { numberSuffix })
  const adjustedTokenSupply = formatBigNumber(realSupply, tokenDecimals)
  const realReserve = reserveBalance ? reserveBalance.minus(toBeClaimed) : null
  const adjustedReserves = realReserve ? formatBigNumber(realReserve, primaryCollateralDecimals, { numberSuffix }) : '...'
  const adjustedMonthlyAllowance = formatBigNumber(toMonthlyAllocation(rate, primaryCollateralDecimals), primaryCollateralDecimals, { numberSuffix })
  const adjustedYearlyAllowance = formatBigNumber(toMonthlyAllocation(rate, primaryCollateralDecimals).times(12), primaryCollateralDecimals, { numberSuffix })

  // trends
  /**
   * Util to get the percentage variation
   * @param {BigNumber} start - start of variation calculation
   * @param {BigNumber} end - end of variation calculation
   * @returns {BigNumber} the variation in percents
   */
  const variation = (start, end) => {
    return end
      .minus(start)
      .div(start)
      .times(100)
  }

  const adjustedPriceTrendPct =
    price && trendBatch?.startPrice ? formatBigNumber(variation(trendBatch.startPrice, price), 0, { keepSign: true, numberSuffix: '%' }) : null
  // if startPrice is here, realSupply too, since NewMetaBatch event occurs before NewBatch one
  const trendBatchMarketCap = marketCap && trendBatch?.startPrice ? trendBatch.startPrice.times(trendBatch.realSupply) : null
  const marketCapDiff = marketCap && trendBatch?.startPrice ? marketCap.minus(trendBatchMarketCap) : null
  const adjustedMarketCapTrend = marketCapDiff ? formatBigNumber(marketCapDiff, primaryCollateralDecimals, { keepSign: true, numberSuffix }) : null
  const tradingTrendVolume = trendBatch?.id
    ? orders
        // only keep primary collateral orders since the start of the trendBatch
        .filter(o => o.collateral === primaryCollateralAddress && o.batchId >= trendBatch.id)
        // keep values
        .map(o => o.value)
        // sum them and tada, you got the trading volume between now and the beginning of the trendBatch
        .reduce((acc, current) => acc.plus(current), new BigNumber(0))
    : null
  const adjustedTradingVolumeTrend = tradingTrendVolume ? formatBigNumber(tradingTrendVolume, primaryCollateralDecimals, { keepSign: true, numberSuffix }) : null
  const adjustedTokenSupplyTrend = trendBatch?.realSupply ? formatBigNumber(realSupply.minus(trendBatch.realSupply), tokenDecimals, { keepSign: true }) : null
  const adjustedReservesTrend =
    reserveBalance && trendBatch?.realBalance
      ? formatBigNumber(realReserve.minus(trendBatch.realBalance), tokenDecimals, { keepSign: true, numberSuffix })
      : null

  return (
    <div>
      <KeyMetrics
        heading={
          <span
            css={`
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
            `}
          >
            Key Metrics
          </span>
        }
        padding={0}
        theme={theme}
      >
        <ul>
          <li>
            <div>
              <p className="title">Price</p>
              <p className="number">{adjustedPrice}</p>
            </div>
            <div>
              <Trend value={adjustedPriceTrendPct} suffix="M" />
            </div>
          </li>
          <li>
            <div>
              <p className="title">Market Cap</p>
              <p className="number">{adjustedMarketCap}</p>
            </div>
            <div>
              <Trend value={adjustedMarketCapTrend} suffix="M" />
            </div>
          </li>
          <li>
            <div>
              <p className="title">Trading Volume</p>
              <p className="number">{adjustedTradingVolume}</p>
            </div>
            <div>
              <Trend value={adjustedTradingVolumeTrend} suffix="M" />
            </div>
          </li>
          <li>
            <div>
              <p className="title">Share Supply</p>
              <p className="number">{adjustedTokenSupply}</p>
            </div>
            <div>
              <Trend value={adjustedTokenSupplyTrend} suffix="M" />
            </div>
          </li>
          <li>
            <div>
              <p className="title">Reserves</p>
              <p className="number">{adjustedReserves}</p>
            </div>
            <div>
              <Trend value={adjustedReservesTrend} suffix="M" />
            </div>
          </li>
          <li>
            <div>
              <p className="title">Monthly Allowance</p>
              <p className="number">{adjustedMonthlyAllowance}</p>
            </div>
            <div>
              <Trend value={adjustedYearlyAllowance} suffix="Y" />
            </div>
          </li>
        </ul>
      </KeyMetrics>
      <Chart />
    </div>
  )
}

const KeyMetrics = styled(Box)`
  margin-bottom: ${2 * GU}px;

  .green {
    color: ${props => props.theme.positive};
  }

  .red {
    color: ${props => props.theme.negative};
  }

  .none {
    visibility: hidden;
  }

  .title {
    margin-bottom: ${2 * GU}px;
    font-weight: 600;
  }

  ul {
    display: flex;
    justify-content: space-between;
    box-sizing: border-box;
    border-radius: 3px;
    padding: ${2 * GU}px;
  }

  li {
    list-style-type: none;

    img {
      display: inline-block;
      height: 16px;
      margin-right: ${1 * GU}px;
    }

    div:last-child {
      display: flex;
    }

    .title {
      display: flex;
      font-size: 16px;
      font-weight: 300;
      color: ${props => props.theme.content};
      white-space: nowrap;
      margin-bottom: ${1.5 * GU}px;
    }

    .number {
      margin-bottom: ${2 * GU}px;
      font-size: 21px;
      line-height: 24px;
    }

    .sub-number {
      font-size: 16px;
      span {
        font-weight: 300;
        color: ${props => props.theme.contentSecondary};
      }
    }
  }

  @media only screen and (max-width: 1152px) {
    ul {
      display: flex;
      flex-direction: column;
      padding: 0;
    }

    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: ${2 * GU}px;
      border-bottom: 1px solid ${props => props.theme.border};

      div:last-child {
        align-self: flex-end;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .number {
        margin-bottom: 0;
      }
    }

    li:last-child {
      border-bottom: none;
    }
  }
`

const Trend = ({ value, suffix }) => {
  // helper to compute the trend color (green if positive, red if negative)
  const getTrendColor = value => (value ? (value.startsWith('-') ? 'red' : 'green') : 'none')
  return (
    <p className={`sub-number ${getTrendColor(value)}`}>
      {value} <span>({suffix})</span>
    </p>
  )
}
