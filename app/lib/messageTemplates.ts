function fallbackTitulo(tituloServico: string) {
  return String(tituloServico || "").trim() || "Servico";
}

export function buildClienteEmailConclusao(osNumero: string, tituloServico: string) {
  return `Prezado cliente, a Ordem de Servico ${osNumero} - ${fallbackTitulo(tituloServico)} foi finalizada com sucesso. Obrigado pela confianca na equipe SERTECH Solucoes.`;
}

export function buildClienteWhatsappConclusao(osNumero: string, tituloServico: string) {
  return `Noticia boa, finalizamos a Ordem de Servico ${osNumero} - ${fallbackTitulo(tituloServico)}. Parabens para todos nos.\nSertech Solucoes`;
}

export function buildTecnicoWhatsappNovaOs(osNumero: string, tituloServico: string) {
  return `Nova OS ${osNumero} liberada para atendimento.\nServico: ${fallbackTitulo(tituloServico)}.`;
}
