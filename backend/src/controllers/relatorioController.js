const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getSessoesRelatorio = async (req, res) => {
    try {
        const { from, to } = req.query
        if (!from || !to) return res.status(400).json({ error: 'Parameters "from" and "to" are required' })

        const sessoes = await prisma.marcacao.findMany({
            where: {
                id_estado: 4,
                data_a_realizar: { gte: new Date(from), lte: new Date(to) }
            },
            include: { docente: true, modalidade: true, sala: true, aluno_marcacao: { include: { aluno: true } } }
        })
        res.json(sessoes)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}

const getHorasDocente = async (req, res) => {
    try {
        const data = await prisma.marcacao.groupBy({
            by: ['id_docente'],
            where: { id_estado: 4 },
            _sum: { duracao_minutos: true },
            _count: true
        })
        res.json(data)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}

const getAlunosRelatorio = async (req, res) => {
    try {
        const marcacoesAlunos = await prisma.aluno_marcacao.findMany({
            where: { marcacao: { id_estado: 4 } },
            include: { aluno: true, marcacao: true }
        })
        const totaisPorAluno = marcacoesAlunos.reduce((acc, registo) => {
            const id = registo.id_aluno
            if (!acc[id]) {
                acc[id] = { aluno: registo.aluno, totalMinutos: 0, totalSessoes: 0 }
            }
            acc[id].totalMinutos += registo.marcacao.duracao_minutos || 0
            acc[id].totalSessoes += 1
            return acc
        }, {})
        res.json(Object.values(totaisPorAluno))
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}

const exportCSV = async (req, res) => {
    try {
        const { from, to } = req.query
        if (!from || !to) return res.status(400).json({ error: 'Parameters "from" and "to" are required' })

        const sessoes = await prisma.marcacao.findMany({
            where: { id_estado: 4, data_a_realizar: { gte: new Date(from), lte: new Date(to) } },
            include: { docente: true, modalidade: true, sala: true }
        })
        const rows = sessoes.map(s => ({
            id: s.id_marcacoes,
            data: s.data_a_realizar?.toISOString().split('T')[0] || 'N/A',
            hora: s.hora_inicio,
            duracao_min: s.duracao_minutos,
            docente: s.docente?.id_utilizador || 'N/A',
            modalidade: s.modalidade?.nome || 'N/A',
            sala: s.sala?.nome || 'N/A'
        }))
        const headers = Object.keys(rows[0] || {}).join(',')
        const lines = rows.map(r => Object.values(r).join(','))
        const csv = [headers, ...lines].join('\n')
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', 'attachment; filename="sessoes.csv"')
        res.send(csv)
    } catch (error) {
        res.status(500).json({ error: 'CSV export failed' })
    }
}

module.exports = { getSessoesRelatorio, getHorasDocente, getAlunosRelatorio, exportCSV };