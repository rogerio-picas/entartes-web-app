*** Settings ***
Documentation       End-to-end CRUD tests for the Eventos API.
...                 Requires the backend server running at http://localhost:3000
...                 and the automation admin account (automation/1234567).
Library             RequestsLibrary
Library             Collections
Library             BuiltIn
Resource            ../resources/auth.resource

Suite Setup         Authenticate As Admin


*** Variables ***
${CREATED_EVENTO_ID}    ${NONE}
${ADMIN_TOKEN}          ${NONE}


*** Test Cases ***

# ---------------------------------------------------------------------------
# AUTH TESTS
# ---------------------------------------------------------------------------

Token De Admin É Válido
    [Documentation]    Verifies the admin token obtained in Suite Setup is accepted by the API.
    [Tags]    auth    smoke
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/auth/me    headers=${headers}    expected_status=200
    ${json}=    Set Variable    ${response.json()}
    Dictionary Should Contain Key    ${json}    id_utilizador
    Dictionary Should Contain Key    ${json}    codigo_username

Login Com Credenciais Inválidas Retorna 401
    [Documentation]    Login endpoint returns 401 for a nonexistent username.
    [Tags]    auth    negative
    ${body}=    Create Dictionary    codigo_username=nonexistent_user_robot    password=wrong_password
    ${response}=    POST    ${BASE_URL}/api/auth/login    json=${body}    expected_status=401
    Dictionary Should Contain Key    ${response.json()}    message

# ---------------------------------------------------------------------------
# CREATE — POST /api/evento
# ---------------------------------------------------------------------------

Criar Evento Com Dados Válidos
    [Documentation]    Admin creates a new event; expects 201 with the evento object.
    [Tags]    evento    crud    create    smoke
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary
    ...    nome=Robot Framework Test Event
    ...    descricao=Created by automated tests
    ...    local=Sala A
    ...    duracao_minutos=${90}
    ${response}=    POST    ${BASE_URL}/api/evento    json=${body}    headers=${headers}    expected_status=201
    ${json}=    Set Variable    ${response.json()}
    Dictionary Should Contain Key    ${json}    evento
    Dictionary Should Contain Key    ${json}    mensagem
    ${evento}=    Get From Dictionary    ${json}    evento
    Dictionary Should Contain Key    ${evento}    id_evento
    Should Be Equal    ${evento}[nome]    Robot Framework Test Event
    Should Be Equal    ${evento}[local]    Sala A
    Should Be Equal As Integers    ${evento}[duracao_minutos]    90
    Should Be Equal As Integers    ${evento}[id_evento_estado]    1
    Set Suite Variable    ${CREATED_EVENTO_ID}    ${evento}[id_evento]

Criar Evento Sem Autenticação Retorna 401
    [Documentation]    Creating an event without a token must return 401.
    [Tags]    evento    negative    auth
    ${body}=    Create Dictionary    nome=Unauthorized Event
    ${response}=    POST    ${BASE_URL}/api/evento    json=${body}    expected_status=401

Criar Evento Sem Campo Obrigatório Retorna 400
    [Documentation]    Creating an event without the required 'nome' field returns 400.
    [Tags]    evento    negative    create
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    descricao=Missing name field
    ${response}=    POST    ${BASE_URL}/api/evento    json=${body}    headers=${headers}    expected_status=400
    Dictionary Should Contain Key    ${response.json()}    error

# ---------------------------------------------------------------------------
# READ — GET /api/evento  and  GET /api/evento/:id
# ---------------------------------------------------------------------------

Listar Eventos Retorna 200
    [Documentation]    Admin can list all events.
    [Tags]    evento    crud    read    smoke
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/evento    headers=${headers}    expected_status=200
    Should Not Be Empty    ${response.json()}

Evento Criado Aparece Na Listagem
    [Documentation]    The event created earlier appears in the full events list.
    [Tags]    evento    crud    read
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/evento    headers=${headers}    expected_status=200
    ${ids}=    Evaluate    [e['id_evento'] for e in $response.json()]
    Should Contain    ${ids}    ${CREATED_EVENTO_ID}

Obter Evento Por ID
    [Documentation]    Fetching the created event by its ID returns the correct record.
    [Tags]    evento    crud    read    smoke
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    headers=${headers}    expected_status=200
    ${json}=    Set Variable    ${response.json()}
    Should Be Equal As Integers    ${json}[id_evento]    ${CREATED_EVENTO_ID}
    Should Be Equal    ${json}[nome]    Robot Framework Test Event

Obter Evento Com ID Inexistente Retorna 404
    [Documentation]    Fetching an event ID that does not exist returns 404.
    [Tags]    evento    negative    read
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/evento/999999    headers=${headers}    expected_status=404
    Dictionary Should Contain Key    ${response.json()}    error

# ---------------------------------------------------------------------------
# UPDATE — PUT /api/evento/:id
# ---------------------------------------------------------------------------

Atualizar Evento Com Dados Válidos
    [Documentation]    Admin updates the event name and duration; expects 200.
    [Tags]    evento    crud    update    smoke
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary
    ...    nome=Robot Framework Test Event (Updated)
    ...    descricao=Updated by automated tests
    ...    duracao_minutos=${120}
    ${response}=    PUT    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    json=${body}    headers=${headers}    expected_status=200
    ${json}=    Set Variable    ${response.json()}
    Dictionary Should Contain Key    ${json}    mensagem
    Should Be Equal    ${json}[evento][nome]    Robot Framework Test Event (Updated)
    Should Be Equal As Integers    ${json}[evento][duracao_minutos]    120

Atualização Reflete Na Consulta Por ID
    [Documentation]    After update, GET by ID returns the updated values.
    [Tags]    evento    crud    update
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    headers=${headers}    expected_status=200
    Should Be Equal    ${response.json()}[nome]    Robot Framework Test Event (Updated)

Atualizar Evento Sem Campos Válidos Retorna 400
    [Documentation]    Sending only unrecognised fields returns 400.
    [Tags]    evento    negative    update
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    unknown_field=value
    ${response}=    PUT    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    json=${body}    headers=${headers}    expected_status=400

Atualizar Evento Inexistente Retorna 404
    [Documentation]    Trying to update an event that does not exist returns 404.
    [Tags]    evento    negative    update
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    nome=Ghost Event
    ${response}=    PUT    ${BASE_URL}/api/evento/999999    json=${body}    headers=${headers}    expected_status=404

# ---------------------------------------------------------------------------
# DELETE (Cancel) — DELETE /api/evento/:id
# ---------------------------------------------------------------------------

Cancelar Evento Inexistente Retorna 404
    [Documentation]    Trying to cancel an event that does not exist returns 404.
    [Tags]    evento    negative    delete
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    DELETE    ${BASE_URL}/api/evento/999999    headers=${headers}    expected_status=404

Cancelar Evento
    [Documentation]    Admin cancels the created event; expects 200.
    [Tags]    evento    crud    delete    smoke
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    DELETE    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    headers=${headers}    expected_status=200
    ${json}=    Set Variable    ${response.json()}
    Dictionary Should Contain Key    ${json}    mensagem
    Should Be Equal As Integers    ${json}[evento_id]    ${CREATED_EVENTO_ID}

Evento Cancelado Tem Estado 5
    [Documentation]    After cancellation, GET returns id_evento_estado = 5 (CANCELADO).
    [Tags]    evento    crud    delete
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    headers=${headers}    expected_status=200
    Should Be Equal As Integers    ${response.json()}[id_evento_estado]    5

Cancelar Evento Já Cancelado Retorna 400
    [Documentation]    Trying to cancel an already-cancelled event returns 400.
    [Tags]    evento    negative    delete
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    DELETE    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    headers=${headers}    expected_status=400
    Dictionary Should Contain Key    ${response.json()}    error


*** Keywords ***
Authenticate As Admin
    [Documentation]    Suite-level setup: login once as admin and store the token.
    ${token}=    Login As Admin
    Set Suite Variable    ${ADMIN_TOKEN}    ${token}
