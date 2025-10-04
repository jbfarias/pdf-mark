# Contribuindo para o PDF Cite

Obrigado por considerar contribuir! Este documento descreve diretrizes para colaborar.

## Fluxo de Trabalho
- Abra uma issue descrevendo a melhoria/bug.
- Faça um fork/branch e implemente mudanças focadas e pequenas.
- Garanta que o app roda localmente e valide seleção/exportação/importação.
- Abra um PR com descrição clara das mudanças e motivação.

## Padrões de Código
- JavaScript simples, sem dependências extras.
- Mantenha nomes descritivos e evite variáveis de uma letra.
- Não adicione comentários excessivos dentro do código; use commits e documentação.
- Preserve o estilo existente e mudanças mínimas.

## Testes Manuais
- Abrir PDF, selecionar trechos, exportar, reimportar (formatos novo e antigo).
- Verificar comportamento sem destaques visuais.
- Checar compatibilidade em subpath (GitHub Pages) e fallback sem worker.

## Commits
- Mensagens claras: o que mudou e por quê.
- Evite incluir mudanças não relacionadas no mesmo commit.

## Segurança
- Evite código que exija permissões elevadas.
- Respeite CORS ao lidar com PDFs remotos.