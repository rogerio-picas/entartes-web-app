*** Settings ***
Library     RequestsLibrary
Library     Collections


*** Variables ***
${BASE_URL}         http://localhost:3000
${ADMIN_USER}       automation
${ADMIN_PASSWORD}   1234567


*** Keywords ***
Login As Admin
    [Documentation]    Performs login as admin and returns the JWT token.
    ${body}=    Create Dictionary    codigo_username=${ADMIN_USER}    password=${ADMIN_PASSWORD}
    ${response}=    POST    ${BASE_URL}/api/auth/login    json=${body}    expected_status=200
    ${token}=    Get From Dictionary    ${response.json()}    token
    RETURN    ${token}

Make Auth Headers
    [Arguments]    ${token}
    [Documentation]    Returns a headers dictionary with the Bearer token set.
    ${headers}=    Create Dictionary    Authorization=Bearer ${token}    Content-Type=application/json
    RETURN    ${headers}
