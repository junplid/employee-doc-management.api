import { Router } from "express";
import { Health } from "./Health";
import { CreateEmployee } from "./CreateEmployee";
import { ListEmployees } from "./ListEmployees";
import { UpdateEmployees } from "./UpdateEmployee";
import { CreateDocumentType } from "./CreateDocumentType";
import { ListDocumentsType } from "./ListDocumentsType";
import { AttachDocument } from "./AttachDocument";
import { DeleteDocument } from "./DeleteDocument";
import { SendDocument } from "./SendDocument";
import { GetEmployeeDocuments } from "./GetEmployeeDocuments";
import { DetachDocument } from "./DetachDocument";

const router = Router();

router.get("/health", Health);
router.get("/documents-type", ListDocumentsType);
router.get("/employees", ListEmployees);
router.get("/employees-documents", GetEmployeeDocuments);

router.post("/employee", CreateEmployee);
router.post("/document-type", CreateDocumentType);
router.post("/attach-document", AttachDocument);
router.post("/send-document", SendDocument);

router.put("/employee/:id", UpdateEmployees);

router.delete("/document-type/:id", DeleteDocument);
router.delete("/detach-document/:id", DetachDocument);

export default router;
