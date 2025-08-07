# The script is simple and straightforward. It retrieves an access token using the Azure CLI, then makes an HTTP GET request to the API endpoint with the token in the Authorization header. The response is then output to the console.
# To run the script, open a PowerShell terminal and execute the following command:
# PS> .\test.ps1

# If everything is set up correctly, you should see the response from the API in JSON format.
# Conclusion
# In this article, we have demonstrated how to secure a Python Flask API with Azure AD using the Microsoft Authentication Library (MSAL) and the Flask-OAuthlib library. We have also shown how to create a front-end application that authenticates users with Azure AD and makes authenticated requests to the API.
# The code for the API and front-end application can be found on  GitHub.
# If you have any questions or feedback, please let us know in the comments.

# Define API Resource and Endpoint
$resource = "api://a873f2d7-2ab9-4d59-a54c-90859226bf2e"
$apiUrl = "http://127.0.0.1:5000/portfolio"

# Get fresh access token
$tokenResponse = az account get-access-token --resource $resource | ConvertFrom-Json
$accessToken = $tokenResponse.accessToken

# Check if token was retrieved
if (-not $accessToken) {
    Write-Host "Failed to retrieve access token." -ForegroundColor Red
    exit 1
}

# Make API request with the token
$response = Invoke-RestMethod -Uri $apiUrl -Method Get -Headers @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type"  = "application/json"
}

# Output response
$response | ConvertTo-Json -Depth 10

