const groupService = require("../services/groupService");

const criarGrupo = async (req, res) => {
  try {
    const grupo = await groupService.criarGrupo(req.params.id_evento, req.body);
    res.status(201).json(grupo);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const listarGruposDoEvento = async (req, res) => {
  try {
    const grupos = await groupService.listarGruposDoEvento(req.params.id_evento);
    res.status(200).json(grupos);
  } catch (erro) {
    res.status(404).json({ erro: erro.message });
  }
};

const adicionarAlunoAoGrupo = async (req, res) => {
  try {
    const resultado = await groupService.adicionarAlunoAoGrupo(
      req.params.id_grupo,
      req.params.id_aluno
    );
    res.status(201).json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const adicionarDocenteAoGrupo = async (req, res) => {
  try {
    const resultado = await groupService.adicionarDocenteAoGrupo(
      req.params.id_grupo,
      req.params.id_docente
    );
    res.status(201).json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};


const removerAlunoDoGrupo = async (req, res) => {
  try {
    const resultado = await groupService.removerAlunoDoGrupo(req.params.id_grupo, req.params.id_aluno);
    res.status(200).json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const removerDocenteDoGrupo = async (req, res) => {
  try {
    const resultado = await groupService.removerDocenteDoGrupo(req.params.id_grupo, req.params.id_docente);
    res.status(200).json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const editarGrupo = async (req, res) => {
  try {
    const grupo = await groupService.editarGrupo(req.params.id_grupo, req.body);
    res.status(200).json(grupo);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

const eliminarGrupo = async (req, res) => {
  try {
    const resultado = await groupService.eliminarGrupo(req.params.id_grupo);
    res.status(200).json(resultado);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
};

module.exports = {
  criarGrupo,
  listarGruposDoEvento,
  adicionarAlunoAoGrupo,
  adicionarDocenteAoGrupo,
  removerAlunoDoGrupo,
  removerDocenteDoGrupo,
  editarGrupo,
  eliminarGrupo,
};