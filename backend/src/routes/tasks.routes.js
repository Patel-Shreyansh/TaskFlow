const express = require("express");
const { list, stats, create, update, remove } = require("../controllers/tasks.controller");

const router = express.Router();

router.get("/", list);
router.get("/stats", stats);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

module.exports = router;
