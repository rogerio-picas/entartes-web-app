
const groupService = require("../services/groupService");

const listarTodosOsGrupos = async (req, res) => {
  try {
    const grupos = await groupService.listarTodosOsGrupos();
    res.status(200).json(grupos);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
};

const criarGrupo = async (req, res) => {
  console.log("--- DEBUG CONTROLLER ---");
  console.log("Params:", req.params);
  console.log("Body:", req.body);
  try {
    // CORREÇÃO: ID do evento não era validado antes de chamar o serviço
    const id_evento = parseInt(req.params.id_evento);
    if (isNaN(id_evento)) return res.status(400).json({ erro: "ID do evento inválido." });

    const grupo = await groupService.criarGrupo(id_evento, req.body);
    res.status(201).json(grupo);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const listarGruposDoEvento = async (req, res) => {
  try {
    // CORREÇÃO: ID do evento não era validado antes de chamar o serviço
    const id_evento = parseInt(req.params.id_evento);
    if (isNaN(id_evento)) return res.status(400).json({ erro: "ID do evento inválido." });

    const grupos = await groupService.listarGruposDoEvento(id_evento);
    res.status(200).json(grupos);
  } catch (erro) {
    res.status(404).json({ erro: erro.message });
  }
};

const adicionarAlunoAoGrupo = async (req, res) => {
  try {
    // CORREÇÃO: IDs dos parâmetros não eram validados antes de chamar o serviço
    const id_evento = parseInt(req.params.id_evento);
    const id_grupo  = parseInt(req.params.id_grupo);
    const id_aluno  = parseInt(req.params.id_aluno);
    if (isNaN(id_evento)) return res.status(400).json({ erro: "ID do evento inválido." });
    if (isNaN(id_grupo))  return res.status(400).json({ erro: "ID do grupo inválido." });
    if (isNaN(id_aluno))  return res.status(400).json({ erro: "ID do aluno inválido." });

    console.log(`Evento: ${id_evento}, Grupo: ${id_grupo}, Aluno: ${id_aluno}`);
    const resultado = await groupService.adicionarAlunoAoGrupo(id_evento, id_grupo, id_aluno);
    res.status(201).json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const adicionarDocenteAoGrupo = async (req, res) => {
  try {
    // CORREÇÃO: IDs dos parâmetros não eram validados antes de chamar o serviço
    const id_evento  = parseInt(req.params.id_evento);
    const id_grupo   = parseInt(req.params.id_grupo);
    const id_docente = parseInt(req.params.id_docente);
    if (isNaN(id_evento))  return res.status(400).json({ erro: "ID do evento inválido." });
    if (isNaN(id_grupo))   return res.status(400).json({ erro: "ID do grupo inválido." });
    if (isNaN(id_docente)) return res.status(400).json({ erro: "ID do docente inválido." });

    const resultado = await groupService.adicionarDocenteAoGrupo(
      id_evento,
      id_grupo,
      id_docente
    );
    res.status(201).json(resultado);
  } catch (erro) {
    if (erro.message.includes('em falta')) {
      return res.status(422).json({ erro: erro.message });
    }
    res.status(400).json({ erro: erro.message });
  }
};


const removerAlunoDoGrupo = async (req, res) => {
  try {
    // CORREÇÃO: IDs dos parâmetros não eram validados antes de chamar o serviço
    const id_grupo = parseInt(req.params.id_grupo);
    const id_aluno = parseInt(req.params.id_aluno);
    if (isNaN(id_grupo)) return res.status(400).json({ erro: "ID do grupo inválido." });
    if (isNaN(id_aluno)) return res.status(400).json({ erro: "ID do aluno inválido." });

    const resultado = await groupService.removerAlunoDoGrupo(id_grupo, id_aluno);
    res.status(200).json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const removerDocenteDoGrupo = async (req, res) => {
  try {
    // CORREÇÃO: IDs dos parâmetros não eram validados antes de chamar o serviço
    const id_grupo   = parseInt(req.params.id_grupo);
    const id_docente = parseInt(req.params.id_docente);
    if (isNaN(id_grupo))   return res.status(400).json({ erro: "ID do grupo inválido." });
    if (isNaN(id_docente)) return res.status(400).json({ erro: "ID do docente inválido." });

    const resultado = await groupService.removerDocenteDoGrupo(id_grupo, id_docente);
    res.status(200).json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const editarGrupo = async (req, res) => {
  try {
    // CORREÇÃO: ID do grupo não era validado antes de chamar o serviço
    const id_grupo = parseInt(req.params.id_grupo);
    if (isNaN(id_grupo)) return res.status(400).json({ erro: "ID do grupo inválido." });

    const grupo = await groupService.editarGrupo(id_grupo, req.body);
    res.status(200).json(grupo);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const eliminarGrupo = async (req, res) => {
  try {
    // CORREÇÃO: ID do grupo não era validado antes de chamar o serviço
    const id_grupo = parseInt(req.params.id_grupo);
    if (isNaN(id_grupo)) return res.status(400).json({ erro: "ID do grupo inválido." });

    const resultado = await groupService.eliminarGrupo(id_grupo);
    res.status(200).json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

module.exports = {
  listarTodosOsGrupos,
  criarGrupo,
  listarGruposDoEvento,
  adicionarAlunoAoGrupo,
  adicionarDocenteAoGrupo,
  removerAlunoDoGrupo,
  removerDocenteDoGrupo,
  editarGrupo,
  eliminarGrupo,
};