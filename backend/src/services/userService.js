const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const criarUtilizador = async (dados) => {
    const { 
        codigo_username, 
        password, 
        id_tipo, 
        nome, 
        apelido, 
        data_nascimento, 
        email, 
        telemovel, 
        nif 
    } = dados;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const tipoInt = id_tipo ? parseInt(id_tipo) : null;

    // 3. Iniciar Transação Atómica
    // Garantimos que o utilizador só é criado se o perfil (aluno/docente/coord) também for.
    return await prisma.$transaction(async (tx) => {
        
        const novoUtilizador = await tx.utilizador.create({
            data: {
                codigo_username: codigo_username,
                password: hashedPassword,
                id_tipo: tipoInt,
                nome: nome || null,
                apelido: apelido || null,
                data_nascimento: data_nascimento ? new Date(data_nascimento) : null,
                email: email || null,
                telemovel: telemovel || null,
                nif: nif || null,
                tentativas_login: 0,
                estado: "ATIVO"
            }
        });

        // Criar o registo na "subclasse" correspondente
        // id_tipo: 1 = Coordenadora, 2 = Docente, 3 = Aluno
        if (tipoInt === 3) { // ALUNO
            await tx.aluno.create({
                data: {
                    id_utilizador: novoUtilizador.id_utilizador,
                }
            });
        } 
        else if (tipoInt === 2) { // DOCENTE
            await tx.docente.create({
                data: {
                    id_utilizador: novoUtilizador.id_utilizador,
                    estado_atividade: true 
                }
            });
        } 
        else if (tipoInt === 1) {
            await tx.coordenadora.create({
                data: {
                    id_utilizador: novoUtilizador.id_utilizador,
                    // data_inicio_funcao usa o dbgenerated("CURRENT_DATE") do teu model
                }
            });
        }

        return novoUtilizador;
    });
};

module.exports = { criarUtilizador };