1. All FX Stream communication functionality located on util directory may be move to another one?
2. Test run ok, after some modifications TestAdvancedTrading not exist
3. Web Server was not modified, need to be updated to support all developed FX Stream functionality:
    market data request,
    market data streaming,
    order management,
    trading
via REST protocol
4. Need to write test for web server functionality
5. We will use postman to talk with webserver, no other frontend required so far.
6. Webserver will need authorization base on MS Entra to execute order management transaction in prod environment
7. Web server Logger need to use log.cfg
8. All FX Stream communication messages need to be put in journal file to review with FX Stream if necessary
9. App need to be placed in docker image to use with kubernetes
10. App need to be formatted according to PEP 8
11. On any command send to FX Stream Server we need get result and confirm execution of command
12. WebSocketClient do nod use may be remove it.
13.