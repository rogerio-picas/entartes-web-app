const horarioEscolaController = require('../../controllers/horarioEscolaController');
const horarioEscolaService = require('../../services/horarioEscolaService');

jest.mock('../../services/horarioEscolaService');

describe('horarioEscolaController', () => {
    let req, res;
    let consoleErrorSpy;

    beforeEach(() => {
        req = { body: {} };
        res = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis(),
        };
        // Silenciar console.error para não poluir o output dos testes com erros esperados
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.clearAllMocks();
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    // ─────────────────────────────────────────────
    // getHorarioEscola
    // ─────────────────────────────────────────────
    describe('getHorarioEscola', () => {
        it('deve retornar o horário quando o serviço devolve dados', async () => {
            const horarioMock = {
                data_inicio: '2025-01-01',
                data_fim: '2025-06-30',
                hora_inicio: '08:00',
                hora_fim: '17:00',
                dias_semana: [1, 2, 3, 4, 5],
            };
            horarioEscolaService.obterHorarioEscola.mockResolvedValue(horarioMock);

            await horarioEscolaController.getHorarioEscola(req, res);

            expect(horarioEscolaService.obterHorarioEscola).toHaveBeenCalledTimes(1);
            expect(res.json).toHaveBeenCalledWith(horarioMock);
        });

        it('deve retornar {} quando o serviço devolve null', async () => {
            horarioEscolaService.obterHorarioEscola.mockResolvedValue(null);

            await horarioEscolaController.getHorarioEscola(req, res);

            expect(res.json).toHaveBeenCalledWith({});
        });

        it('deve retornar {} quando o serviço devolve undefined', async () => {
            horarioEscolaService.obterHorarioEscola.mockResolvedValue(undefined);

            await horarioEscolaController.getHorarioEscola(req, res);

            expect(res.json).toHaveBeenCalledWith({});
        });

        it('deve retornar 500 quando o serviço lança um erro', async () => {
            horarioEscolaService.obterHorarioEscola.mockRejectedValue(new Error('DB error'));

            await horarioEscolaController.getHorarioEscola(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Erro ao obter o horário da escola.' });
        });
    });

    // ─────────────────────────────────────────────
    // updateHorarioEscola
    // ─────────────────────────────────────────────
    describe('updateHorarioEscola', () => {
        const bodyValido = {
            data_inicio: '2025-01-01',
            data_fim: '2025-06-30',
            hora_inicio: '08:00',
            hora_fim: '17:00',
            dias_semana: [1, 2, 3, 4, 5],
        };

        it('deve atualizar e retornar sucesso com dados válidos', async () => {
            req.body = { ...bodyValido };
            const horarioAtualizado = { id: 1, ...bodyValido };
            horarioEscolaService.atualizarHorarioEscola.mockResolvedValue(horarioAtualizado);

            await horarioEscolaController.updateHorarioEscola(req, res);

            expect(horarioEscolaService.atualizarHorarioEscola).toHaveBeenCalledWith(
                bodyValido.data_inicio,
                bodyValido.data_fim,
                bodyValido.hora_inicio,
                bodyValido.hora_fim,
                bodyValido.dias_semana
            );
            expect(res.json).toHaveBeenCalledWith({
                message: 'Horário atualizado com sucesso.',
                data: horarioAtualizado,
            });
        });

        // Testes de validação — campo em falta
        const camposObrigatorios = ['data_inicio', 'data_fim', 'hora_inicio', 'hora_fim', 'dias_semana'];

        camposObrigatorios.forEach((campo) => {
            it(`deve retornar 400 quando "${campo}" está ausente`, async () => {
                const bodyInvalido = { ...bodyValido };
                delete bodyInvalido[campo];
                req.body = bodyInvalido;

                await horarioEscolaController.updateHorarioEscola(req, res);

                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.json).toHaveBeenCalledWith({
                    message:
                        'Todos os campos (data_inicio, data_fim, hora_inicio, hora_fim, dias_semana) são obrigatórios.',
                });
                expect(horarioEscolaService.atualizarHorarioEscola).not.toHaveBeenCalled();
            });
        });

        it('deve retornar 400 quando dias_semana não é um array', async () => {
            req.body = { ...bodyValido, dias_semana: '1,2,3' };

            await horarioEscolaController.updateHorarioEscola(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                message:
                    'Todos os campos (data_inicio, data_fim, hora_inicio, hora_fim, dias_semana) são obrigatórios.',
            });
        });

        it('deve retornar 500 com a mensagem do erro quando o serviço lança um erro com mensagem', async () => {
            req.body = { ...bodyValido };
            horarioEscolaService.atualizarHorarioEscola.mockRejectedValue(
                new Error('Datas inválidas')
            );

            await horarioEscolaController.updateHorarioEscola(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ message: 'Datas inválidas' });
        });

        it('deve retornar 500 com mensagem genérica quando o erro não tem mensagem', async () => {
            req.body = { ...bodyValido };
            horarioEscolaService.atualizarHorarioEscola.mockRejectedValue({});

            await horarioEscolaController.updateHorarioEscola(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                message: 'Erro ao atualizar o horário da escola.',
            });
        });
    });
});