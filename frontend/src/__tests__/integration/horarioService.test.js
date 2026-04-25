import { describe, it, expect, vi, beforeEach } from 'vitest'
import { horarioService } from '../../services/horarioService'
import { api } from '../../services/api'

// Mock the API service
vi.mock('../../services/api', () => ({
    api: {
        get: vi.fn(),
        post: vi.fn(),
    }
}))

describe('horarioService Integration-like Test', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should fetch and correctly map user sessions (getMinhasAulas)', async () => {
        // Mock data matching the API response structure
        const mockApiResponse = [
            {
                id_marcacoes: 101,
                data_a_realizar: '2026-05-10',
                hora_inicio: '14:00',
                duracao_minutos: 60,
                modalidade: { nome: 'Piano' },
                sala: { nome: 'Sala A' },
                estado_marcacao: { id_estado: 2, nome: 'Confirmada' },
                docente: {
                    utilizador: { nome: 'John', apelido: 'Doe' }
                },
                aluno_marcacao: [
                    { aluno: { utilizador: { nome: 'Jane', apelido: 'Smith' } } }
                ]
            }
        ]

        vi.mocked(api.get).mockResolvedValue(mockApiResponse)

        const result = await horarioService.getMinhasAulas()

        // Verify API was called
        expect(api.get).toHaveBeenCalledWith('/horario/minhas-aulas')

        // Verify mapping logic
        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
            id: 101,
            modalidade: 'Piano',
            docente: 'John Doe',
            sala: 'Sala A',
            estado_nome: 'Confirmada',
            alunos: ['Jane Smith']
        })
        expect(result[0].data).toBe('10/05/2026')
        expect(result[0].hora).toBe('14:00')
    })

    it('should return empty array when API returns non-array', async () => {
        vi.mocked(api.get).mockResolvedValue(null)
        const result = await horarioService.getMinhasAulas()
        expect(result).toEqual([])
    })
})
