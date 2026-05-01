const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getSessoesRelatorio = async (req, res) => {
    try {
        const { from, to } = req.query
        if (!from || !to) return res.status(400).json({ error: 'Parameters "from" and "to" are required' })

        // CORREÇÃO: datas não eram validadas quanto ao formato nem à ordem (to >= from)
        if (isNaN(new Date(from).getTime())) return res.status(400).json({ error: '"from" tem formato de data inválido' })
        if (isNaN(new Date(to).getTime()))   return res.status(400).json({ error: '"to" tem formato de data inválido' })
        if (new Date(to) <= new Date(from))  return res.status(400).json({ error: '"to" deve ser posterior a "from"' })

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
        const { data_inicio, data_fim } = req.query

        // CORREÇÃO: datas não eram validadas quanto ao formato nem à ordem (fim >= início)
        if (data_inicio && isNaN(new Date(data_inicio).getTime())) return res.status(400).json({ error: 'data_inicio tem formato de data inválido' })
        if (data_fim    && isNaN(new Date(data_fim).getTime()))    return res.status(400).json({ error: 'data_fim tem formato de data inválido' })
        if (data_inicio && data_fim && new Date(data_fim) <= new Date(data_inicio)) return res.status(400).json({ error: 'data_fim deve ser posterior a data_inicio' })

        const dateFilter = {}
        if (data_inicio) dateFilter.gte = new Date(data_inicio)
        if (data_fim)    dateFilter.lte = new Date(data_fim)
        const marcacaoWhere = { id_estado: 4, ...(Object.keys(dateFilter).length && { data_a_realizar: dateFilter }) }

        const docentes = await prisma.docente.findMany({
            include: {
                utilizador: { select: { nome: true, apelido: true } },
                marcacao: { where: marcacaoWhere, include: { modalidade: { select: { nome: true } } } }
            }
        })
        const result = docentes
            .filter(d => d.marcacao.length > 0)
            .map(d => ({
                id_docente: d.id_utilizador,
                nome: `${d.utilizador?.nome ?? ''} ${d.utilizador?.apelido ?? ''}`.trim(),
                modalidades: [...new Set(d.marcacao.map(m => m.modalidade?.nome).filter(Boolean))],
                _count: d.marcacao.length,
                _sum: { duracao_minutos: d.marcacao.reduce((s, m) => s + (m.duracao_minutos ?? 0), 0) }
            }))
        res.json(result)
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' })
    }
}

const getAlunosRelatorio = async (req, res) => {
    try {
        const { data_inicio, data_fim } = req.query

        // CORREÇÃO: datas não eram validadas quanto ao formato nem à ordem (fim >= início)
        if (data_inicio && isNaN(new Date(data_inicio).getTime())) return res.status(400).json({ error: 'data_inicio tem formato de data inválido' })
        if (data_fim    && isNaN(new Date(data_fim).getTime()))    return res.status(400).json({ error: 'data_fim tem formato de data inválido' })
        if (data_inicio && data_fim && new Date(data_fim) <= new Date(data_inicio)) return res.status(400).json({ error: 'data_fim deve ser posterior a data_inicio' })

        const dateFilter = {}
        if (data_inicio) dateFilter.gte = new Date(data_inicio)
        if (data_fim)    dateFilter.lte = new Date(data_fim)
        const marcacaoWhere = { id_estado: 4, ...(Object.keys(dateFilter).length && { data_a_realizar: dateFilter }) }

        const alunos = await prisma.aluno.findMany({
            include: {
                utilizador: { select: { nome: true, apelido: true } },
                aluno_marcacao: {
                    where: { marcacao: marcacaoWhere },
                    include: { marcacao: { include: { modalidade: { select: { nome: true } } } } }
                }
            }
        })
        const result = alunos
            .filter(a => a.aluno_marcacao.length > 0)
            .map(a => ({
                id: a.id_utilizador,
                nome: `${a.utilizador?.nome ?? ''} ${a.utilizador?.apelido ?? ''}`.trim(),
                modalidades: [...new Set(a.aluno_marcacao.map(am => am.marcacao?.modalidade?.nome).filter(Boolean))],
                totalSessoes: a.aluno_marcacao.length,
                totalMinutos: a.aluno_marcacao.reduce((s, am) => s + (am.marcacao?.duracao_minutos ?? 0), 0)
            }))
        res.json(result)
    } catch (error) {
        console.error('getAlunosRelatorio:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

const getDocentesRelatorio = async (req, res) => {
    try {
        const docentes = await prisma.docente.findMany({
            include: {
                utilizador: { select: { nome: true, apelido: true } },
                marcacao: {
                    where: { id_estado: 4 },
                    include: { modalidade: { select: { nome: true } } }
                }
            }
        })
        const result = docentes
            .filter(d => d.marcacao.length > 0)
            .map(d => ({
                id: d.id_utilizador,
                nome: `${d.utilizador?.nome ?? ''} ${d.utilizador?.apelido ?? ''}`.trim(),
                modalidades: [...new Set(d.marcacao.map(m => m.modalidade?.nome).filter(Boolean))],
                totalSessoes: d.marcacao.length,
                totalMinutos: d.marcacao.reduce((s, m) => s + (m.duracao_minutos ?? 0), 0)
            }))
        res.json(result)
    } catch (error) {
        console.error('getDocentesRelatorio:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
}

const exportCSV = async (req, res) => {
    try {
        const { from, to } = req.query
        if (!from || !to) return res.status(400).json({ error: 'Parameters "from" and "to" are required' })

        // CORREÇÃO: datas não eram validadas quanto ao formato nem à ordem (to >= from)
        if (isNaN(new Date(from).getTime())) return res.status(400).json({ error: '"from" tem formato de data inválido' })
        if (isNaN(new Date(to).getTime()))   return res.status(400).json({ error: '"to" tem formato de data inválido' })
        if (new Date(to) <= new Date(from))  return res.status(400).json({ error: '"to" deve ser posterior a "from"' })

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

module.exports = { getSessoesRelatorio, getHorasDocente, getAlunosRelatorio, getDocentesRelatorio, exportCSV };