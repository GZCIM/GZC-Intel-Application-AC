# Project Roadmap

This document outlines the project roadmap for FXSpotStream, focusing on essential functionalities and referencing relevant documentation.

## 1. Initial Setup and Configuration

- Ensure all necessary environment variables are set in the `.env` file.
- Verify the presence of required keys and certificates for secure connections.

## 2. Core Functionalities

### FIX Protocol Handling

- Implement FIX session management, including logon, logout, and message handling.
- Reference: [Session Management](FSS_Rules_of_Engagement_Specification_Summary.md#10-session-management)

### WebSocket Communication

- Establish WebSocket connections for real-time data exchange.
- Reference: [Connectivity Options](FSS_Rules_of_Engagement_Specification_Summary.md#5-connectivity-options)

## 3. Market Data and Trading

### Market Data Subscription

- Implement market data requests and handle responses.
- Reference: [ESP Market Data](FSS_Rules_of_Engagement_Specification_Summary.md#11-esp-market-data)

### Order Management

- Develop order submission, modification, and cancellation functionalities.
- Reference: [Orders and Executions](FSS_Rules_of_Engagement_Specification_Summary.md#12-orders-and-executions)

## 4. Advanced Features

### Support for Broken Dates and NDFs

- Implement trading on broken dates and handle NDF transactions.
- Reference: [Tenors and Broken Dates](FSS_Rules_of_Engagement_Specification_Summary.md#7-tenors-and-broken-dates)

### Pre-Trade Allocations

- Support pre-trade allocations for enhanced trading strategies.
- Reference: [Pre-Trade Allocations](FSS_Rules_of_Engagement_Specification_Summary.md#9-pre-trade-allocations)

## 5. Testing and Validation

- Conduct thorough testing of all functionalities in a simulated environment.
- Reference: [Simulator](FSS_Rules_of_Engagement_Specification_Summary.md#4.1-simulator)

This roadmap focuses on the essential functionalities, and we can elaborate on the details as we progress.
