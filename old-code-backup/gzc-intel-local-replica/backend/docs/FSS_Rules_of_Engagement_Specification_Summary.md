# FSS Rules of Engagement Specification Summary

The `FSS - FIX ROE Specification_v1_5_10.pdf` document provides comprehensive details on the Rules of Engagement for FXSpotStream, focusing on the FIX protocol. Here's a summary of the key sections and information extracted from the document:

## 1. Document History

Lists the version history and changes made over time, with the latest update on February 20, 2024.

## 2. Introduction and Purpose

Describes the design of the FSS FIX Protocol engine and connectivity with the FSS FX Trading Platform for electronic Foreign Exchange Trading.

## 3. Summary

Explains the two methods for receiving prices and executing trades: Executable Streaming Pricing (ESP) and Request For Streams (RFS), each requiring dedicated FIX sessions.

## 4. Liquidity Providers

Lists the banks providing liquidity and their execution capabilities, including Fill-Or-Kill (FOK), Immediate-Or-Cancel (IOC), Slippage, and VWAP.

## 5. Connectivity Options

Details various connection methods like Xconnect, Extranet, VPN, and Public Internet.

## 6. Supported Trading Protocols

Describes the trading protocols (ESP, RFS) and how to trade using the FSS FIX Trading API.

## 7. Tenors and Broken Dates

Lists supported tenors and explains trading on broken dates using the RFS and ESP protocols.

## 8. NDF Transactions

Discusses Non-Deliverable Forwards (NDFs) and provider requirements for fixing dates.

## 9. Pre-Trade Allocations

Covers support for pre-trade allocations on ESP and RFS protocols.

## 10. Session Management

Details the logon and logout message definitions for establishing sessions.

## 11. ESP Market Data

Explains how to subscribe to market data and the different subscription options for trading protocols.

## 12. Orders and Executions

Provides details on submitting orders, limit orders, and execution reports.

## 13. Request for Stream (RFS)

Describes the RFS message definitions and examples for forward trading and broken dates.

## 14. Standard FIX Message Definitions

Lists standard message headers, trailers, and definitions for various FIX messages.

## 15. Status and Error Messages

Provides a list of status and error messages sent by the FSS Trading Platform.

## 16. Appendices

Includes currency pairs, tenors for ESP Forwards and NDFs, price precisions, and FIX dictionary.

This document serves as a detailed guide for implementing and interacting with the FXSpotStream platform using the FIX protocol.
