*** Settings ***
Documentation       Testes end-to-end de CRUD para a API de Eventos.
...                 Requer o servidor backend em execução em http://localhost:3000
...                 e a conta de administrador de automação (automation/1234567).
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
    [Documentation]    Verifica que o token de admin obtido no Suite Setup é aceite pela API.
    ...                Utiliza /api/auth/me para evitar tentativas de login adicionais que possam causar bloqueio.
    [Tags]    auth    smoke
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/auth/me    headers=${headers}    expected_status=200
    ${json}=    Set Variable    ${response.json()}
    Dictionary Should Contain Key    ${json}    id_utilizador
    Dictionary Should Contain Key    ${json}    codigo_username

Login Com Credenciais Inválidas Retorna 401
    [Documentation]    O endpoint de login retorna 401 para um utilizador inexistente.
    ...                Utiliza um username que não existe para não arriscar o bloqueio de contas reais.
    [Tags]    auth    negative
    ${body}=    Create Dictionary    codigo_username=nonexistent_user_robot    password=wrong_password
    ${response}=    POST    ${BASE_URL}/api/auth/login    json=${body}    expected_status=401
    Dictionary Should Contain Key    ${response.json()}    message

# ---------------------------------------------------------------------------
# CREATE — POST /api/evento
# ---------------------------------------------------------------------------

Criar Evento Com Dados Válidos
    [Documentation]    O admin cria um novo evento; espera resposta 201 com o objeto do evento.
    [Tags]    evento    crud    create    smoke
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary
    ...    nome=Robot Framework Test Event
    ...    descricao=Criado por testes automáticos
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
    [Documentation]    Criar um evento sem token de autenticação deve retornar 401.
    [Tags]    evento    negative    auth
    ${body}=    Create Dictionary    nome=Evento Não Autorizado
    ${response}=    POST    ${BASE_URL}/api/evento    json=${body}    expected_status=401

Criar Evento Sem Campo Obrigatório Retorna 400
    [Documentation]    Criar um evento sem o campo obrigatório 'nome' deve retornar 400.
    [Tags]    evento    negative    create
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    descricao=Campo nome em falta
    ${response}=    POST    ${BASE_URL}/api/evento    json=${body}    headers=${headers}    expected_status=400
    Dictionary Should Contain Key    ${response.json()}    error

# ---------------------------------------------------------------------------
# READ — GET /api/evento  e  GET /api/evento/:id
# ---------------------------------------------------------------------------

Listar Eventos Retorna 200
    [Documentation]    O admin consegue listar todos os eventos.
    [Tags]    evento    crud    read    smoke
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/evento    headers=${headers}    expected_status=200
    Should Not Be Empty    ${response.json()}

Evento Criado Aparece Na Listagem
    [Documentation]    O evento criado anteriormente aparece na listagem completa de eventos.
    [Tags]    evento    crud    read
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/evento    headers=${headers}    expected_status=200
    ${ids}=    Evaluate    [e['id_evento'] for e in $response.json()]
    Should Contain    ${ids}    ${CREATED_EVENTO_ID}

Obter Evento Por ID
    [Documentation]    Consultar o evento criado pelo seu ID retorna o registo correto.
    [Tags]    evento    crud    read    smoke
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    headers=${headers}    expected_status=200
    ${json}=    Set Variable    ${response.json()}
    Should Be Equal As Integers    ${json}[id_evento]    ${CREATED_EVENTO_ID}
    Should Be Equal    ${json}[nome]    Robot Framework Test Event

Obter Evento Com ID Inexistente Retorna 404
    [Documentation]    Consultar um evento com ID inexistente deve retornar 404.
    [Tags]    evento    negative    read
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/evento/999999    headers=${headers}    expected_status=404
    Dictionary Should Contain Key    ${response.json()}    error

# ---------------------------------------------------------------------------
# UPDATE — PUT /api/evento/:id
# ---------------------------------------------------------------------------

Atualizar Evento Com Dados Válidos
    [Documentation]    O admin atualiza o nome e a duração do evento; espera resposta 200.
    [Tags]    evento    crud    update    smoke
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary
    ...    nome=Robot Framework Test Event (Atualizado)
    ...    descricao=Atualizado por testes automáticos
    ...    duracao_minutos=${120}
    ${response}=    PUT    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    json=${body}    headers=${headers}    expected_status=200
    ${json}=    Set Variable    ${response.json()}
    Dictionary Should Contain Key    ${json}    mensagem
    Should Be Equal    ${json}[evento][nome]    Robot Framework Test Event (Atualizado)
    Should Be Equal As Integers    ${json}[evento][duracao_minutos]    120

Atualização Reflete Na Consulta Por ID
    [Documentation]    Após a atualização, a consulta por ID retorna os valores atualizados.
    [Tags]    evento    crud    update
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    headers=${headers}    expected_status=200
    Should Be Equal    ${response.json()}[nome]    Robot Framework Test Event (Atualizado)

Atualizar Evento Sem Campos Válidos Retorna 400
    [Documentation]    Enviar apenas campos não reconhecidos na atualização deve retornar 400.
    [Tags]    evento    negative    update
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    campo_desconhecido=valor
    ${response}=    PUT    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    json=${body}    headers=${headers}    expected_status=400

Atualizar Evento Inexistente Retorna 404
    [Documentation]    Tentar atualizar um evento que não existe deve retornar 404.
    [Tags]    evento    negative    update
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    nome=Evento Fantasma
    ${response}=    PUT    ${BASE_URL}/api/evento/999999    json=${body}    headers=${headers}    expected_status=404

# ---------------------------------------------------------------------------
# DELETE (Cancelar) — DELETE /api/evento/:id
# ---------------------------------------------------------------------------

Cancelar Evento Inexistente Retorna 404
    [Documentation]    Tentar cancelar um evento que não existe deve retornar 404.
    [Tags]    evento    negative    delete
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    DELETE    ${BASE_URL}/api/evento/999999    headers=${headers}    expected_status=404

Cancelar Evento
    [Documentation]    O admin cancela o evento criado; espera resposta 200.
    [Tags]    evento    crud    delete    smoke
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    DELETE    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    headers=${headers}    expected_status=200
    ${json}=    Set Variable    ${response.json()}
    Dictionary Should Contain Key    ${json}    mensagem
    Should Be Equal As Integers    ${json}[evento_id]    ${CREATED_EVENTO_ID}

Evento Cancelado Tem Estado 5
    [Documentation]    Após o cancelamento, a consulta do evento retorna id_evento_estado = 5 (CANCELADO).
    [Tags]    evento    crud    delete
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    headers=${headers}    expected_status=200
    Should Be Equal As Integers    ${response.json()}[id_evento_estado]    5

Cancelar Evento Já Cancelado Retorna 400
    [Documentation]    Tentar cancelar um evento que já foi cancelado deve retornar 400.
    [Tags]    evento    negative    delete
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${response}=    DELETE    ${BASE_URL}/api/evento/${CREATED_EVENTO_ID}    headers=${headers}    expected_status=400
    Dictionary Should Contain Key    ${response.json()}    error


*** Keywords ***
Authenticate As Admin
    [Documentation]    Configuração da suite: realiza login uma única vez como admin e guarda o token.
    ${token}=    Login As Admin
    Set Suite Variable    ${ADMIN_TOKEN}    ${token}
