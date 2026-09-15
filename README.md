# Documentação Técnica e Plano de Deploy: Aplicação Lista de Tarefas

## 1. Arquitetura de Referência do Deploy

1. Camada de Versionamento (GitHub)
2. Camada de Orquestração (GitHub Actions)
3. Camada de Registro (Azure Container Registry)
4. Camada de Execução (Azure App Service)

## 2. Especificação dos Recursos Utilizados na Nuvem

### Grupo de Recursos (`rg-python-aula`)
* **Função:** Agrupamento lógico, governança e gerenciamento de ciclo de vida de todos os recursos do projeto.
* **Região de Alocação:** Chile Central.
* **Modelo de Assinatura:** Azure for Students.

### Azure Container Registry (`acraula12`)
* **Servidor de Login:** `acraula12.azurecr.io`
* **Função:** Armazenar e gerenciar de forma privada as imagens Docker da aplicação.
* **Artefato Gerado:** `minha-app:latest`

### Azure App Service (`webapp-aula123`)
* **Função:** Prover o ambiente de execução para o contêiner Linux da aplicação.
* **Plano de Serviço (App Service Plan):** `ASP-rgpythonaula-a11a` rodando na camada de computação `B1`.
* **Configuração de Rede:** Mapeamento de tráfego direcionado para a porta interna 80.

### Identidade Gerenciada Atribuída pelo Usuário (`ua-id-ac33`)
* **Função:** Estabelecer uma relação de confiança segura entre os serviços da Azure sem a necessidade de expor senhas textuais (passwords) ou chaves de API no código.
* **Permissão Aplicada:** Atribuição de função do Azure RBAC do tipo `AcrPull`, garantindo que o App Service possua permissões estritas de leitura para baixar a imagem contida no ACR.

---

## 3. Configuração e Especificação do Contêiner

O processo interno foi desenhado para aceitar conexões em todas as interfaces de rede (`0.0.0.0`) escutando na porta **80**.

---

## 4. Processo Executivo de Implantação e Atualização

Para realizar atualizações na aplicação ou disparar o fluxo manual de build através da Azure CLI, o operador deve seguir o roteiro de comandos abaixo:

### Passo 1: Autenticação no Provedor de Nuvem
Efetue o login seguro no terminal e valide se o contexto aponta para a assinatura acadêmica correta:
```bash
az login
az account show
```

### Passo 2: Construção da Imagem Remota (Build no ACR)
Navegue até o diretório raiz do projeto onde está localizado o `Dockerfile` e execute o comando abaixo. Este comando envia o contexto do código local diretamente para os servidores de build da Azure, gerando o pacote sem consumir recursos da máquina local:
```bash
az acr build --registry acraula12 --image minha-app:latest .
```

### Passo 3: Sincronização e Reinicialização do Serviço
Como a implantação contínua está habilitada nas configurações do App Service, o gatilho de detecção de nova imagem será disparado. Caso seja necessário mitigar problemas de cache ou acelerar a aplicação da nova versão, execute o comando de reinício forçado:
```bash
az webapp restart --resource-group rg-python-aula --name webapp-aula123
```
