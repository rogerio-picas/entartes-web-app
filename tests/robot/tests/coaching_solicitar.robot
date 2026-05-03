*** Settings ***
Documentation       Testes end-to-end para POST /api/coaching/marcacao/solicitar e fluxo do aluno.
...                 Requer o servidor backend em execução em http://localhost:3000
...                 e as contas de automação: automation/1234567 (admin) e aluno/aluno (aluno).
...                 Ajustar DOCENTE_ID e MODALIDADE_ID conforme os registos presentes na BD de dev.
Library             RequestsLibrary
Library             Collections
Library             BuiltIn
Resource            ../resources/auth.resource

Suite Setup         Authenticate All Roles


*** Variables ***
${ALUNO_TOKEN}          ${NONE}
${ADMIN_TOKEN}          ${NONE}
${DOCENTE_TOKEN}        ${NONE}
${CREATED_MARCACAO_ID}  ${NONE}
${DOCENTE_ID}           ${1}
${MODALIDADE_ID}        ${1}
${DATA_FUTURA}          2027-06-15
${HORA_INICIO}          10:00


*** Test Cases ***

# ---------------------------------------------------------------------------
# AUTH TESTS
# ---------------------------------------------------------------------------

Token De Aluno É Válido
    [Documentation]    Verifica que o token de aluno obtido no Suite Setup é aceite pela API.
    [Tags]    auth    smoke
    ${headers}=    Make Auth Headers    ${ALUNO_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/auth/me    headers=${headers}    expected_status=200
    Dictionary Should Contain Key    ${response.json()}    id_utilizador

Solicitar Sem Autenticação Retorna 401
    [Documentation]    Chamar o endpoint sem token deve retornar 401.
    [Tags]    auth    negative
    ${body}=    Create Dictionary    id_docente=${DOCENTE_ID}    id_modalidade=${MODALIDADE_ID}
    ...    data_a_realizar=${DATA_FUTURA}    hora_inicio=${HORA_INICIO}    duracao_minutos=${60}
    ${response}=    POST    ${BASE_URL}/api/coaching/marcacao/solicitar    json=${body}    expected_status=401

Solicitar Com Role Admin Retorna 403
    [Documentation]    Apenas o role aluno (3) pode solicitar — admin (1) deve receber 403.
    [Tags]    auth    negative
    ${headers}=    Make Auth Headers    ${ADMIN_TOKEN}
    ${body}=    Create Dictionary    id_docente=${DOCENTE_ID}    id_modalidade=${MODALIDADE_ID}
    ...    data_a_realizar=${DATA_FUTURA}    hora_inicio=${HORA_INICIO}    duracao_minutos=${60}
    ${response}=    POST    ${BASE_URL}/api/coaching/marcacao/solicitar    json=${body}    headers=${headers}    expected_status=403

Solicitar Com Role Docente Retorna 403
    [Documentation]    Apenas o role aluno (3) pode solicitar — docente (2) deve receber 403.
    [Tags]    auth    negative
    ${headers}=    Make Auth Headers    ${DOCENTE_TOKEN}
    ${body}=    Create Dictionary    id_docente=${DOCENTE_ID}    id_modalidade=${MODALIDADE_ID}
    ...    data_a_realizar=${DATA_FUTURA}    hora_inicio=${HORA_INICIO}    duracao_minutos=${60}
    ${response}=    POST    ${BASE_URL}/api/coaching/marcacao/solicitar    json=${body}    headers=${headers}    expected_status=403

# ---------------------------------------------------------------------------
# VALIDAÇÕES DE INPUT — POST /api/coaching/marcacao/solicitar
# ---------------------------------------------------------------------------

Solicitar Sem Campos Obrigatórios Retorna 400
    [Documentation]    Enviar payload vazio deve retornar 400 com mensagem a listar os campos obrigatórios.
    [Tags]    coaching    negative    create
    ${headers}=    Make Auth Headers    ${ALUNO_TOKEN}
    ${body}=    Create Dictionary
    ${response}=    POST    ${BASE_URL}/api/coaching/marcacao/solicitar    json=${body}    headers=${headers}    expected_status=400
    ${msg}=    Get From Dictionary    ${response.json()}    message
    Should Contain    ${msg}    obrigatórios

Solicitar Com Data No Passado Retorna 400
    [Documentation]    data_a_realizar no passado deve ser rejeitada com 400.
    [Tags]    coaching    negative    create
    ${headers}=    Make Auth Headers    ${ALUNO_TOKEN}
    ${body}=    Create Dictionary
    ...    id_docente=${DOCENTE_ID}    id_modalidade=${MODALIDADE_ID}
    ...    data_a_realizar=2000-01-01    hora_inicio=${HORA_INICIO}    duracao_minutos=${60}
    ${response}=    POST    ${BASE_URL}/api/coaching/marcacao/solicitar    json=${body}    headers=${headers}    expected_status=400
    ${msg}=    Get From Dictionary    ${response.json()}    message
    Should Contain    ${msg}    passado

Solicitar Com Data Em Formato Inválido Retorna 400
    [Documentation]    data_a_realizar com formato inválido deve retornar 400.
    [Tags]    coaching    negative    create
    ${headers}=    Make Auth Headers    ${ALUNO_TOKEN}
    ${body}=    Create Dictionary
    ...    id_docente=${DOCENTE_ID}    id_modalidade=${MODALIDADE_ID}
    ...    data_a_realizar=nao-e-uma-data    hora_inicio=${HORA_INICIO}    duracao_minutos=${60}
    ${response}=    POST    ${BASE_URL}/api/coaching/marcacao/solicitar    json=${body}    headers=${headers}    expected_status=400
    ${msg}=    Get From Dictionary    ${response.json()}    message
    Should Contain    ${msg}    formato inválido

Solicitar Com Horário Fora Da Disponibilidade Retorna 400
    [Documentation]    Pedir um slot cuja hora_inicio + duracao_minutos não cabe dentro de nenhuma
    ...                disponibilidade do docente deve retornar 400.
    [Tags]    coaching    negative    create
    ${headers}=    Make Auth Headers    ${ALUNO_TOKEN}
    ${body}=    Create Dictionary
    ...    id_docente=${DOCENTE_ID}    id_modalidade=${MODALIDADE_ID}
    ...    data_a_realizar=${DATA_FUTURA}    hora_inicio=03:00    duracao_minutos=${60}
    ${response}=    POST    ${BASE_URL}/api/coaching/marcacao/solicitar    json=${body}    headers=${headers}    expected_status=400
    ${msg}=    Get From Dictionary    ${response.json()}    message
    Should Contain    ${msg}    não cabe dentro da disponibilidade

# ---------------------------------------------------------------------------
# CREATE — POST /api/coaching/marcacao/solicitar
# ---------------------------------------------------------------------------

Solicitar Marcação Com Dados Válidos
    [Documentation]    O aluno solicita uma marcação com todos os campos válidos; espera 201.
    [Tags]    coaching    crud    create    smoke
    ${headers}=    Make Auth Headers    ${ALUNO_TOKEN}
    ${body}=    Create Dictionary
    ...    id_docente=${DOCENTE_ID}
    ...    id_modalidade=${MODALIDADE_ID}
    ...    data_a_realizar=${DATA_FUTURA}
    ...    hora_inicio=${HORA_INICIO}
    ...    duracao_minutos=${60}
    ${response}=    POST    ${BASE_URL}/api/coaching/marcacao/solicitar    json=${body}    headers=${headers}    expected_status=201
    ${json}=    Set Variable    ${response.json()}
    Dictionary Should Contain Key    ${json}    message
    Dictionary Should Contain Key    ${json}    details
    ${details}=    Get From Dictionary    ${json}    details
    Dictionary Should Contain Key    ${details}    id_marcacao
    Set Suite Variable    ${CREATED_MARCACAO_ID}    ${details}[id_marcacao]

Solicitar Marcação Duplicada Para O Mesmo Slot Retorna 400
    [Documentation]    Repetir o mesmo pedido (mesmo docente, data e hora) enquanto o anterior ainda
    ...                está pendente deve ser rejeitado com 400 — pedido duplicado.
    [Tags]    coaching    negative    create
    ${headers}=    Make Auth Headers    ${ALUNO_TOKEN}
    ${body}=    Create Dictionary
    ...    id_docente=${DOCENTE_ID}
    ...    id_modalidade=${MODALIDADE_ID}
    ...    data_a_realizar=${DATA_FUTURA}
    ...    hora_inicio=${HORA_INICIO}
    ...    duracao_minutos=${60}
    ${response}=    POST    ${BASE_URL}/api/coaching/marcacao/solicitar    json=${body}    headers=${headers}    expected_status=400
    ${msg}=    Get From Dictionary    ${response.json()}    message
    Should Contain    ${msg}    Já existe um pedido

# ---------------------------------------------------------------------------
# READ — GET /api/coaching/meus-pedidos
# ---------------------------------------------------------------------------

Listar Meus Pedidos Retorna 200
    [Documentation]    O aluno consegue listar os seus pedidos de coaching.
    [Tags]    coaching    crud    read    smoke
    ${headers}=    Make Auth Headers    ${ALUNO_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/coaching/meus-pedidos    headers=${headers}    expected_status=200
    Should Not Be Empty    ${response.json()}

Marcação Criada Aparece Na Listagem
    [Documentation]    A marcação criada anteriormente aparece na lista de pedidos do aluno.
    [Tags]    coaching    crud    read
    ${headers}=    Make Auth Headers    ${ALUNO_TOKEN}
    ${response}=    GET    ${BASE_URL}/api/coaching/meus-pedidos    headers=${headers}    expected_status=200
    ${ids}=    Evaluate    [m['id_marcacao'] for m in $response.json()]
    Should Contain    ${ids}    ${CREATED_MARCACAO_ID}

Listar Meus Pedidos Sem Autenticação Retorna 401
    [Documentation]    Listar pedidos sem token deve retornar 401.
    [Tags]    coaching    negative    read
    ${response}=    GET    ${BASE_URL}/api/coaching/meus-pedidos    expected_status=401

# ---------------------------------------------------------------------------
# DELETE — DELETE /api/coaching/pedido/:id_marcacao/cancelar
# ---------------------------------------------------------------------------

Cancelar Pedido Inexistente Retorna 404
    [Documentation]    Tentar cancelar uma marcação com ID inexistente deve retornar 404.
    [Tags]    coaching    negative    delete
    ${headers}=    Make Auth Headers    ${ALUNO_TOKEN}
    ${response}=    DELETE    ${BASE_URL}/api/coaching/pedido/999999/cancelar    headers=${headers}    expected_status=404
    Dictionary Should Contain Key    ${response.json()}    message

Cancelar Pedido Pendente Com Sucesso
    [Documentation]    O aluno cancela a marcação pendente criada; espera 200.
    [Tags]    coaching    crud    delete    smoke
    ${headers}=    Make Auth Headers    ${ALUNO_TOKEN}
    ${response}=    DELETE    ${BASE_URL}/api/coaching/pedido/${CREATED_MARCACAO_ID}/cancelar    headers=${headers}    expected_status=200
    ${json}=    Set Variable    ${response.json()}
    Dictionary Should Contain Key    ${json}    message

Cancelar Pedido Já Cancelado Retorna 400
    [Documentation]    Tentar cancelar uma marcação que já foi cancelada deve retornar 400.
    [Tags]    coaching    negative    delete
    ${headers}=    Make Auth Headers    ${ALUNO_TOKEN}
    ${response}=    DELETE    ${BASE_URL}/api/coaching/pedido/${CREATED_MARCACAO_ID}/cancelar    headers=${headers}    expected_status=400
    Dictionary Should Contain Key    ${response.json()}    message


*** Keywords ***
Authenticate All Roles
    [Documentation]    Suite Setup: autentica como aluno, docente e admin, guardando os três tokens.
    ${aluno_token}=     Login As Aluno
    ${docente_token}=   Login As Docente
    ${admin_token}=     Login As Admin
    Set Suite Variable    ${ALUNO_TOKEN}      ${aluno_token}
    Set Suite Variable    ${DOCENTE_TOKEN}    ${docente_token}
    Set Suite Variable    ${ADMIN_TOKEN}      ${admin_token}

Login As Aluno
    [Documentation]    Realiza login com a conta de aluno e devolve o token JWT.
    ${body}=      Create Dictionary    codigo_username=aluno    password=aluno
    ${response}=  POST    ${BASE_URL}/api/auth/login    json=${body}    expected_status=200
    ${token}=     Get From Dictionary    ${response.json()}    token
    RETURN    ${token}

Login As Docente
    [Documentation]    Realiza login com a conta de docente de automação e devolve o token JWT.
    ${body}=      Create Dictionary    codigo_username=automation.docente    password=automation.docente
    ${response}=  POST    ${BASE_URL}/api/auth/login    json=${body}    expected_status=200
    ${token}=     Get From Dictionary    ${response.json()}    token
    RETURN    ${token}
