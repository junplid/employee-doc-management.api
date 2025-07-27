# employee-doc-management.api

O objetivo é desenvolver uma API RESTful com foco na criação e acompanhamento do fluxo de documentação obrigatória de colaboradores.

---

## Sumário

- [Antes de tudo](#antes-de-tudo)
- [Visão geral](#visão-geral)
- [Convenções](#convenções)
- [Paginação por cursor](#paginação-por-cursor)
- [Endpoints](#endpoints)
  - [GET /documents-type](#get-documents-type)
  - [GET /employees](#get-employees)
  - [GET /employees-documents](#get-employees-documents)
  - [POST /employee](#post-employee)
  - [POST /document-type](#post-document-type)
  - [POST /attach-document](#post-attach-document)
  - [POST /send-document](#post-send-document)
  - [PUT /employee/](#put-employeeid)[:id](#put-employeeid)
  - [DELETE /document-type/](#delete-document-typeid)[:id](#delete-document-typeid)
  - [DELETE /detach-document/](#delete-detach-document)
- [Exemplos de uso de cursores](#exemplos-de-uso-de-cursores)

---

## Configuração (local, com Docker)

1. **Clonar o repositório**

   ```bash
   git clone https://github.com/junplid/employee-doc-management.api.git
   cd employee-doc-management.api
   ```

2. **Copiar arquivos de ambiente**

   ```bash
   cp .env.pg.example .env.pg
   cp app/.env.example app/.env
   ```

3. **Instalar dependências e gerar Prisma Client** (no host)

   ```bash
   cd app
   yarn install
   npx prisma generate
   cd ..
   ```

4. **Subir a infraestrutura** (PostgreSQL, API, etc.)

   ```bash
   docker compose -f docker-compose.dev.yml up -d
   docker compose ps
   ```

5. **Aplicar migrações do Prisma**

   - Acesse o container da API e crie as migrações conforme schema:

6. **Verificar a API**

   ```bash
   curl http://localhost:4000/health
   ```

---

## Visão geral

A API permite:

1. Cadastrar, listar e atualizar **colaborador**.
2. Cadastrar, listar e deletar **tipos de documentos**.
3. Obter lista de **colaboradores** com documentos enviados e/ou pendentes.
4. Obter documentação de um **colaborador**.
5. Vincular/desvincular tipo(s) de **documento(s)** do **colaborador**.
6. Enviar **documento** com o tipo relacionado do **colaborador**.

---

## Convenções

- **BASE_URL**: `http://localhost:4000` (ambiente local de desenvolvimento).
- **Content-Type**: `application/json; charset=utf-8`.
- **Campos booleanos** aceitam `true`/`false`.
- **Cursors** (`after`, `before`, `nextCursor`, `prevCursor`) representam o `id` do último/primeiro item da página atual. **Tipo**: `string \| number`.
- **Ordenação**: paginação por cursor pressupõe ordenação consistente por `id` (ascendente), salvo outro critério documentado.

---

## Paginação por cursor

Todos os endpoints de listagem retornam:

```json
{
  "list": [
    /* itens */
  ],
  "nextCursor": "<cursor-ou-null>",
  "prevCursor": "<cursor-ou-null>"
}
```

- Para a **próxima** página: `after=<nextCursor>`.
- Para a **anterior**: `before=<prevCursor>`.
- `limit` define o número máximo de itens por página.

> Observação: `prevCursor` pode ser `null` na primeira página.

---

## Endpoints

### GET /documents-type

Lista os **tipos de documentos** cadastrados, com paginação por cursor.

**Query params**

| Param    | Tipo               | Obrigatório | Descrição                                                        |
| -------- | ------------------ | ----------- | ---------------------------------------------------------------- |
| `limit`  | `number`           | Não         | Máximo de itens por página.                                      |
| `page`   | `number`           | Não         | Compatibilidade. Prefira `after`/`before`.                       |
| `before` | `string \| number` | Não         | Cursor para buscar itens **antes** deste `id` (página anterior). |
| `after`  | `string \| number` | Não         | Cursor para buscar itens **depois** deste `id` (próxima página). |

**Resposta 200:**

```json
{
  "list": [
    {
      fields: [
        {
          required: true;
          name: "Nome completo",
        },
        {
          required: false;
          name: "Numero",
        },
      ],
      id: 1,
      name: "RG",
    }
  ],
  "nextCursor": 12,
  "prevCursor": null
}
```

**Exemplos:**

```bash
curl -s "http://localhost:4000/documents-type?limit=5" -H "Accept: application/json"
curl -s "http://localhost:4000/documents-type?limit=5&after=12" -H "Accept: application/json"
```

---

### GET /employees

Lista **colaboradores** com filtros e paginação por cursor.

**Query params**

| Param     | Tipo               | Obrigatório | Descrição                                                                 |
| --------- | ------------------ | ----------- | ------------------------------------------------------------------------- |
| `name`    | `string`           | Não         | Filtro por nome (contém).                                                 |
| `docType` | `string`           | Não         | Filtro por tipo de documento relacionado.                                 |
| `limit`   | `number`           | Não         | Máximo de itens por página.                                               |
| `page`    | `number`           | Não         | Compatibilidade. Prefira `after`/`before`.                                |
| `before`  | `string \| number` | Não         | Cursor para buscar itens **antes** deste `id`.                            |
| `after`   | `string \| number` | Não         | Cursor para buscar itens **depois** deste `id`.                           |
| `deleted` | `boolean`          | Não         | Inclui registros **excluídos logicamente** quando `true`.                 |
| `pending` | `boolean`          | Não         | Quando `true`, retorna apenas colaboradores com **documentos pendentes**. |

**Resposta 200:**

```json
{
  "list": [
    {
      "id": 101,
      "name": "Ana Souza",
      "cpf": "00000000000",
      "pending": true,
      "deleted": false,
      "hiredAt": Date,
      "createdAt": Date,
    }
  ],
  "nextCursor": 101,
  "prevCursor": null
}
```

**Exemplos:**

```bash
curl -s "http://localhost:4000/employees?name=Ana&pending=true&limit=5" -H "Accept: application/json"
curl -s "http://localhost:4000/employees?after=101&limit=5" -H "Accept: application/json"
```

---

### GET /employees-documents

Retorna os **documentos** esperados/entregues de um colaborador.

**Query params**

| Param         | Tipo     | Obrigatório | Regras                      |
| ------------- | -------- | ----------- | --------------------------- |
| `employeeCpf` | `string` | Condicional | Informe `ou` (ao menos um). |
| `employeeId`  | `number` | Condicional | Informe `ou` (ao menos um). |

> Envie **apenas um** identificador.

**Resposta 200:**

```json
{
  "documents": [
    {
      "id": 72,
      "name": "RG",
      "required": true,
      "sent": true,
      "fieldsValue": [
        { "required": true, "name": "numero", "value": "1234567" },
        { "required": true, "name": "arquivo", "value": "https://.../rg.pdf" }
      ]
    }
  ]
}
```

**Exemplos:**

```bash
oCpf="00000000000"
curl -s "http://localhost:4000/employees-documents?employeeCpf={employeeCpf}" -H "Accept: application/json"
curl -s "http://localhost:4000/employees-documents?employeeId=101" -H "Accept: application/json"
```

---

### POST /employee

Cria um **colaborador** (opcionalmente já vinculando tipos de documentos).

**Body**

```json
{
  "name": "Rian Carlos",
  "cpf": "00000000000",
  "hiredAt": "29/07/2025",

  // opcional
  "docsType": [
    { "name": "RG", "required": true, "desc": "Documento de identidade" }
  ]
}
```

**Resposta 200:**

```json
{ "employee": { "id": 101 } }
```

**Exemplo:**

```bash
curl -s -X POST "http://localhost:4000/employee" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rian Carlos",
    "cpf": "00000000000",
    "hiredAt": "29/07/2025",
    "docsType": [
      { "name": "RG", "required": true, "desc": "Documento de identidade" }
    ]
  }'
```

---

### POST /document-type

Cria um **tipo de documento** com seus campos.

**Body**

```json
{
  "name": "RG",
  "fields": [
    { "name": "numero", "required": true },
    { "name": "arquivo", "required": false }
  ]
}
```

**Resposta 200:**

```json
{ "document": { "id": 12 } }
```

**Exemplo:**

```bash
curl -s -X POST "http://localhost:4000/document-type" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RG",
    "fields": [ { "name": "numero", "required": true }, { "name": "arquivo", "required": true } ]
  }'
```

---

### POST /attach-document

Vincula **tipos de documentos** a um colaborador.

**Body**

```json
{
  "employeeCpf": "00000000000",
  "docsType": [
    { "name": "RG", "required": true, "desc": "Documento de identidade" }
  ]
}
```

> Alternativamente use `employeeCpf` em vez de `employeeId`.

**Resposta 200:**

```json
{ "message": "documents attached successfully" }
```

**Exemplo:**

```bash
curl -s -X POST "http://localhost:4000/attach-document" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeCpf": "00000000000",
    "docsType": [ { "name": "RG", "required": true } ]
  }'
```

---

### POST /send-document

Envia o **documento preenchido** de um determinado tipo para o colaborador.

**Body**

```json
{
  "employeeCpf": "00000000000",
  "docType": {
    "name": "RG",
    "fields": {
      "numero": "1234567",
      "arquivo": "https://.../rg.pdf"
    }
  }
}
```

> Alternativamente use `employeeCpf` em vez de `employeeId`.

**Resposta 200:**

```json
{ "message": "Document sent successfully" }
```

**Exemplo:**

```bash
curl -s -X POST "http://localhost:4000/send-document" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeCpf": "00000000000",
    "docType": { "name": "RG", "fields": { "numero": "1234567", "arquivo": "https://.../rg.pdf" } }
  }'
```

---

### PUT /employee/\:id

Atualiza dados de um **colaborador**.

**Path param:**

- `id` (number) – identificador do colaborador.

**Body**

```json
{
  "name": "Rian Carlos (novo contratado)"
}
```

**Resposta 200:**

```json
{ "updatedAt": "2025-01-01T12:00:00.000Z", "id": 101 }
```

**Exemplo:**

```bash
curl -s -X PUT "http://localhost:4000/employee/101" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rian Carlos (novo contratado)"
  }'
```

---

### DELETE /document-type/\:id

Remove um **tipo de documento**.

**Path param:**

- `id` (number) – identificador do tipo de documento.

**Body (DTO) opcional:**

```json
{ "id": 12 }
```

**Resposta 200:**

```json
{ "message": "Document deleted with successfully" }
```

**Exemplo:**

```bash
curl -s -X DELETE "http://localhost:4000/document-type/12" -H "Accept: application/json"
```

---

### DELETE /detach-document

Desvincula **tipos de documentos** de um colaborador.

**Query params**

| Param         | Tipo     | Obrigatório | Regras                      |
| ------------- | -------- | ----------- | --------------------------- |
| `employeeCpf` | `string` | Condicional | Informe `ou` (ao menos um). |
| `employeeId`  | `number` | Condicional | Informe `ou` (ao menos um). |

> Envie **apenas um** identificador.

**Body**

```json
{
  "employeeId": 101,
  "docsType": ["RG"]
}
```

> Alternativamente use `employeeCpf` em vez de `employeeId`.

**Resposta 200:**

```json
{ "message": "document successfully detached" }
```

**Exemplo:**

```bash
# usando corpo com employeeId
curl -s -X DELETE "http://localhost:4000/detach-document" \
  -H "Content-Type: application/json" \
  -d '{ "employeeCpf": "00000000000", "docsType": ["RG"] }'
```

---

## Exemplos de uso de cursores

### Fluxo típico (primeira, próxima e anterior páginas)

1. **Primeira página**: `GET /employees?limit=25` → retorna `nextCursor` (ex.: `101`) e `prevCursor: null`.
2. **Próxima página**: `GET /employees?limit=25&after=101` → novo `nextCursor` (ex.: `128`) e `prevCursor` (ex.: `102`).
3. **Página anterior**: `GET /employees?limit=25&before=102`.

> Armazene `(nextCursor, prevCursor)` junto com os itens para facilitar navegação bidirecional.
