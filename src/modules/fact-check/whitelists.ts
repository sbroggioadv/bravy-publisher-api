// === WHITELIST FACTUAL ===
// Tudo aqui foi validado em fonte oficial. Citacoes fora dessa lista exigem
// confirmacao manual antes de subir.

export const WHITELIST_LEIS = new Set<string>([
  'Lei 12.506/2011',        // aviso previo proporcional
  'Lei 13.467/2017',        // reforma trabalhista (CLT 484-A)
  'Lei 14.973/2024',        // consolidacao DIRBI
  'Decreto 12.797/2025',    // salario minimo 2026
  'IN RFB 2.198/2024',      // DIRBI
  'IN 2.198/2024',
  'IN RFB 2.055/2021',      // PER/DCOMP
  'Portaria MPS/MF 13/2026',
  'Portaria MPS/MF 13',
  'Portaria 13/2026',
  'Portaria MTP 671/2021',
  'Portaria 671/2021',
  'Portaria 671',
  'Resolução Senado 13/2012',
  'Resolução 13/2012',
  'LC 190/2022',
  'LC 116/2003',
  'Convênio ICMS 142',
  'Convênio ICMS 142/2018',
  'Convênio ICMS 38/13',
  'Convênio ICMS 38/2013',
  'MP 1.227/2024',
  'art. 484-A',
  'CLT 484-A',
  'art. 7º XXIX',
  'CTN art. 168',
  'CTN art. 173',
  'CTN art. 174',
]);

// Eventos eSocial validados
export const WHITELIST_ESOCIAL = new Set<string>([
  'S-1000', 'S-1005', 'S-1010', 'S-1020',
  'S-2200', 'S-2205', 'S-2206', 'S-2210', 'S-2220', 'S-2230',
  'S-2240', 'S-2298', 'S-2299', 'S-2300', 'S-2399',
  'S-1200', 'S-1202', 'S-1207', 'S-1210', 'S-1280', 'S-1295', 'S-1299',
  'S-3000',
]);

// Eventos EFD-Reinf validados (incluindo nomes de series: R-2000, R-4000)
export const WHITELIST_REINF = new Set<string>([
  'R-1000', 'R-2010', 'R-2020', 'R-2099',
  'R-4010', 'R-4020', 'R-4040', 'R-4080',
  'R-9000',
  // Series / familias (terminologia da RFB)
  'R-2000',  // serie de retencao previdenciaria (R-2010/2020/2099)
  'R-4000',  // serie de retencao IR/CSLL/PIS/COFINS (R-4010/4020/4040/4080)
]);

// Categorias eSocial validadas (Tabela 01)
export const WHITELIST_CATEGORIAS = new Set<number>([
  101, 103, 104, 201, 202, 401, 901,
]);

// Motivos desligamento (Tabela 19) -- numeros explicitamente validados
export const WHITELIST_MOTIVOS_DESLIGAMENTO = new Set<number>([
  2, 3, 6, 14, 27,  // 484-A NAO esta aqui -- nao cravamos codigo
]);

// CFOPs comuns confirmados
export const WHITELIST_CFOP = new Set<string>([
  '1102', '5102', '5403', '5404', '5405',
  '6101', '6102', '6108', '6403', '6404', '6405',
  '1.xxx', '2.xxx', '5.xxx', '6.xxx',  // padroes genericos
]);

// Codigos DARF -- TODOS sao "use com ressalva" (variam por contexto)
export const WHITELIST_DARF_AVISO = new Set<string>([
  '0561',   // IRRF assalariado (mais comum)
  '1708', '2172', '5952', '6912', '2484',  // citaveis com ressalva
]);

// Aliquotas/valores 2026 validados
export const VALORES_2026_VALIDADOS = new Map<string, string>([
  // INSS
  ['1.621', 'salário mínimo 2026'],
  ['1.621,00', 'salário mínimo 2026'],
  ['2.902,84', 'INSS faixa 2'],
  ['4.354,27', 'INSS faixa 3'],
  ['8.475,55', 'INSS teto 2026'],
  ['988,09', 'INSS desconto máximo 2026'],
  // IRRF 2026
  ['5.000', 'IRRF redutor isenção'],
  ['7.350', 'IRRF redução parcial topo'],
  ['189,59', 'IRRF dedução dependente'],
  ['607,20', 'IRRF simplificado mensal'],
  ['27,5%', 'IRRF alíquota máxima'],
  // Salario familia
  ['67,54', 'salário família 2026'],
  ['1.980,38', 'salário família teto remuneração'],
  // FGTS
  ['8%', 'FGTS mensal'],
  ['40%', 'FGTS multa rescisão'],
  ['20%', 'FGTS multa 484-A'],
  // PIS/COFINS
  ['0,65%', 'PIS cumulativo'],
  ['1,65%', 'PIS não cumulativo'],
  ['3%', 'COFINS cumulativo'],
  ['7,6%', 'COFINS não cumulativo'],
  // IRPJ/CSLL
  ['15%', 'IRPJ'],
  ['9%', 'CSLL'],
  // ICMS
  ['4%', 'ICMS interestadual importado'],
  ['7%', 'ICMS interestadual'],
  ['12%', 'ICMS interestadual'],
  // Reforma Tributaria
  ['0,9%', 'CBS fase teste 2026'],
  ['0,1%', 'IBS fase teste 2026'],
  // INSS patronal
  // NOTE: '20%' ja existe acima com 'FGTS multa 484-A'; Map sobrescreve com ultimo valor
  // No Python dict, '20%' ficaria com 'INSS patronal'. Mantemos o mesmo comportamento.
]);
// Corrige a ultima entrada pra manter o mesmo comportamento do dict Python
// onde a ultima atribuicao vence:
VALORES_2026_VALIDADOS.set('20%', 'INSS patronal');

// Datas criticas
export const DATAS_VALIDADAS = new Map<string, string>([
  ['01/03/2024', 'FGTS Digital início'],
  ['março/2024', 'FGTS Digital'],
  ['março de 2024', 'FGTS Digital'],
  ['junho/2024', 'DIRBI início'],
  ['junho de 2024', 'DIRBI'],
  ['julho/2024', 'DIRBI primeiro prazo'],
  ['julho de 2024', 'DIRBI'],
  ['21/09/2023', 'EFD-Reinf R-4000 início'],
  ['2023', 'GFIP extinta + DCTFWeb'],
  ['2026', 'Reforma Tributária fase teste'],
  ['2027', 'CBS substitui PIS/COFINS'],
  ['2032', 'Transição IBS'],
  ['2033', 'Regime único'],
]);
