const express = require("express");
const router = express.Router();
const { pool } = require("../db");
const { authenticateToken, requirePerm } = require("../middleware/auth");

const LAYER_META = {
  "angiang:rung": { table: "rung", label: "Rừng", nameCol: "ten" }, // Chuẩn của bạn
  "angiang:dat": { table: "dat", label: "Đất", nameCol: "ten" },
  "angiang:waterways": {
    table: "waterways",
    label: "Sông ngòi",
    nameCol: "ten",
  },
  "angiang:khoangsan_diem_mo": {
    table: "khoangsan_diem_mo",
    label: "Khoáng sản",
    nameCol: "ten_don_vi", // Phải là ten_don_vi vì Frontend gửi lên như vậy
  },
  "angiang:dongvat": {
    table: "dongvat_ag",
    label: "Động vật",
    nameCol: "ten_loai", // Phải là ten_loai
  },
  "angiang:thucvat": {
    table: "thucvat_ag",
    label: "Thực vật",
    nameCol: "ten_loai", // Phải là ten_loai
  },
};

const LAYER_TABLE_MAP = {
  "angiang:rung": "rung",
  rung: "rung",
  "angiang:dat": "dat",
  dat: "dat",
  "angiang:waterways": "waterways",
  waterways: "waterways",
  "angiang:khoangsan_diem_mo": "khoangsan_diem_mo",
  khoangsan_diem_mo: "khoangsan_diem_mo",
  "angiang:thucvat": "thucvat_ag",
  thucvat_ag: "thucvat_ag",
  "angiang:dongvat": "dongvat_ag",
  dongvat_ag: "dongvat_ag",
  "angiang:waterways": "waterways",
  waterways: "waterways",
};

async function pickLabelColumn(table) {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1`,
    [table],
  );
  const cols = new Set(rows.map((r) => r.column_name));
  return (
    [
      "ten",
      "name",
      "ten_don_vi",
      "ten_tai_nguyen",
      "ten_khoang_san",
      "loai",
      "ma",
    ].find((c) => cols.has(c)) || null
  );
}

// Routes
router.get(
  "/roles",
  authenticateToken,
  requirePerm("admin.users"),
  async (req, res) => {
    const { rows } = await pool.query(
      "SELECT id, ma, ten FROM public.vai_tro ORDER BY id ASC",
    );
    res.json(rows);
  },
);

router.get(
  "/users",
  authenticateToken,
  requirePerm("admin.users"),
  async (req, res) => {
    const sql = `SELECT tk.id, tk.ho_ten, tk.email, tk.trang_thai, tk.created_at, COALESCE(array_agg(DISTINCT vt.ma) FILTER (WHERE vt.ma  
      IS NOT NULL), '{}') AS roles
                   FROM public.tai_khoan tk LEFT JOIN public.tai_khoan_vai_tro tkvt ON tkvt.tai_khoan_id = tk.id LEFT JOIN public.vai_tro vt
      ON vt.id = tkvt.vai_tro_id
                   GROUP BY tk.id ORDER BY tk.id ASC;`;
    const { rows } = await pool.query(sql);
    res.json(rows);
  },
);

router.patch(
  "/users/:id/status",
  authenticateToken,
  requirePerm("admin.users"),
  async (req, res) => {
    const id = Number(req.params.id);
    const { trang_thai } = req.body || {};
    const { rows } = await pool.query(
      "UPDATE public.tai_khoan SET trang_thai=$2 WHERE id=$1 RETURNING id, email, trang_thai",
      [id, trang_thai],
    );
    res.json({ ok: true, user: rows[0] });
  },
);
router.put(
  "/users/:id/roles",
  authenticateToken,
  requirePerm("admin.users"),
  async (req, res) => {
    const id = Number(req.params.id);
    const { roles } = req.body;
    try {
      await pool.query("BEGIN");
      await pool.query(
        "DELETE FROM public.tai_khoan_vai_tro WHERE tai_khoan_id = $1",
        [id],
      );
      if (roles && roles.length > 0) {
        for (const rMa of roles) {
          const { rows: rRows } = await pool.query(
            "SELECT id FROM public.vai_tro WHERE ma = $1",
            [rMa],
          );
          if (rRows.length > 0) {
            await pool.query(
              "INSERT INTO public.tai_khoan_vai_tro (tai_khoan_id, vai_tro_id) VALUES ($1, $2)",
              [id, rRows[0].id],
            );
          }
        }
      }
      await pool.query("COMMIT");
      res.json({ ok: true, message: "Cập nhật vai trò thành công" });
    } catch (e) {
      await pool.query("ROLLBACK");
      res.status(500).json({ message: "Lỗi cập nhật vai trò" });
    }
  },
);
router.delete(
  "/users/:id",
  authenticateToken,
  requirePerm("admin.users"),
  async (req, res) => {
    const id = Number(req.params.id);
    try {
      await pool.query("DELETE FROM public.tai_khoan WHERE id = $1", [id]);
      res.json({ ok: true, message: "Đã xóa tài khoản" });
    } catch (e) {
      res.status(500).json({ message: "Lỗi xóa tài khoản" });
    }
  },
);
router.get(
  "/layers",
  authenticateToken,
  requirePerm("admin.users"),
  (req, res) => {
    res.json(
      Object.keys(LAYER_META).map((layer) => ({
        layer,
        table: LAYER_META[layer].table,
        label: LAYER_META[layer].label,
      })),
    );
  },
);

router.get(
  "/resource-history",
  authenticateToken,
  requirePerm("admin.users"),
  async (req, res) => {
    try {
      const layer = req.query.layer || "angiang:rung";
      const meta = LAYER_META[layer]; // Lấy cấu hình của lớp này

      if (!meta) return res.status(400).json({ message: "Sai layer" });

      const table = meta.table;
      const nameCol = meta.nameCol || "ten"; // Lấy tên cột, mặc định là 'ten'

      // Câu lệnh SQL chuẩn xác cho từng bảng
      const q = (req.query.q || "").trim();
      let whereClause = "";
      let params = [];

      if (q) {
        whereClause = `WHERE t.${nameCol} ILIKE $1`;
        params.push(`%${q}%`);
      }

      const sql = `
              SELECT
                  t.*,
                  u1.ho_ten as ten_nguoi_tao,
                  u2.ho_ten as ten_nguoi_cap_nhat,
                  t.${nameCol} as ten_tai_nguyen
              FROM public.${table} t
              LEFT JOIN public.tai_khoan u1 ON CAST(u1.id AS TEXT) = CAST(t.nguoi_tao AS TEXT)
              LEFT JOIN public.tai_khoan u2 ON CAST(u2.id AS TEXT) = CAST(t.nguoi_cap_nhat AS TEXT)
             ${whereClause}
           ORDER BY
              -- Ưu tiên ngày cập nhật mới nhất, nếu không có thì dùng ngày tạo
              COALESCE(t.ngay_cap_nhat, t.ngay_tao) DESC,
              t.id DESC
            LIMIT 1000
        `;

      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (e) {
      console.error("HISTORY_ERROR:", e); // In lỗi ra console để debug
      res.status(500).json({ message: "Lỗi lấy lịch sử" });
    }
  },
);
router.get(
  "/layer-objects",
  authenticateToken,
  requirePerm("admin.users"),
  async (req, res) => {
    try {
      const { layer, status, q } = req.query;
      const meta = LAYER_META[layer];
      if (!meta)
        return res.status(400).json({ message: "Lớp dữ liệu không hợp lệ" });

      const table = meta.table;
      const nameCol = meta.nameCol || "ten";

      let whereClauses = [];
      let params = [];

      // 1. Lọc theo trạng thái
      if (status && status !== "tat_ca") {
        whereClauses.push(`t.trang_thai_du_lieu = $${params.length + 1}`);
        params.push(status);
      } else {
        whereClauses.push(`t.trang_thai_du_lieu != 'da_xoa'`);
      }

      // 2. Tìm kiếm theo tên
      if (q && q.trim() !== "") {
        whereClauses.push(`t.${nameCol} ILIKE $${params.length + 1}`);
        params.push(`%${q.trim()}%`);
      }

      const whereSql =
        whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

      // 3. Câu lệnh SQL với ORDER BY thông minh (Chờ duyệt -> Nháp -> Công bố)
      const sql = `
                      SELECT t.*, u.ho_ten as ten_nguoi_tao, t.${nameCol} as ten
                         FROM public.${table} t
                         LEFT JOIN public.tai_khoan u ON CAST(u.id AS TEXT) = CAST(t.nguoi_tao AS TEXT)
                        ${whereSql}
                        ORDER BY
                          CASE
                             WHEN t.trang_thai_du_lieu::text = 'cho_xoa' THEN 1
                            WHEN t.trang_thai_du_lieu::text = 'cho_duyet' THEN 2
                            WHEN t.trang_thai_du_lieu::text = 'nhap' THEN 3
                            WHEN t.trang_thai_du_lieu::text = 'cong_bo' THEN 4
                            ELSE 5
                          END ASC,
                          COALESCE(t.ngay_cap_nhat, t.ngay_tao) DESC NULLS LAST
                        LIMIT 1000
                    `;

      const { rows } = await pool.query(sql, params);
      res.json(rows);
    } catch (e) {
      console.error("LOI_GET_OBJECTS:", e); // In lỗi chi tiết ra Terminal
      res
        .status(500)
        .json({ message: "Lỗi hệ thống khi lấy danh sách đối tượng" });
    }
  },
);

// Endpoint cập nhật trạng thái dữ liệu (Duyệt/Công bố/Từ chối)
router.patch(
  "/layer-objects/stage",
  authenticateToken,
  requirePerm("admin.users"),
  async (req, res) => {
    try {
      const { layer, ids, stage, reason } = req.body;
      const table = LAYER_TABLE_MAP[layer];

      if (!table || !ids || !ids.length)
        return res.status(400).json({ message: "Dữ liệu thiếu" });

      // 1. Tự động kiểm tra cột khóa chính là id hay gid
      const { rows: colCheck } = await pool.query(
        `SELECT column_name FROM information_schema.columns
              WHERE table_schema = 'public'
              AND table_name = $1
              AND column_name IN ('gid', 'id', 'fid', 'objectid')`,
        [table],
      );

      const validCols = colCheck.map((c) => c.column_name);

      // THAY ĐỔI CHI TIẾT: Đưa 'gid' lên đầu tiên để ưu tiên
      const idCol = validCols.includes("gid")
        ? "gid"
        : validCols.includes("id")
          ? "id"
          : validCols.includes("fid")
            ? "fid"
            : validCols.includes("objectid")
              ? "objectid"
              : "id";

      // 2. Chuẩn bị dữ liệu (IDs gửi từ Frontend)
      const numericIds = ids.map((id) => parseInt(id));
      const uid = parseInt(req.user.sub || req.user.id || 0);
      const now = new Date().toISOString();

      console.log(
        `[DEBUG] Bảng: ${table} | Cột ID dùng: ${idCol} | Danh sách ID: ${numericIds}`,
      );

      // 3. Thực thi SQL
      const sql = `
                UPDATE public.${table}
                SET trang_thai_du_lieu = $1::text::trang_thai_du_lieu_enum,
                    ly_do = (CASE WHEN $1::text = 'cong_bo' THEN NULL ELSE $2::text END),
                    nguoi_phe_duyet = $3::integer,
                    ngay_phe_duyet = $4,
                    ngay_cong_bo = (CASE WHEN $1::text = 'cong_bo' THEN $4 ELSE ngay_cong_bo END)
                WHERE ${idCol} = ANY($5::integer[])
            `;
      const values = [stage, reason || null, uid, now, numericIds];
      const result = await pool.query(sql, values);

      // Sau đó mới kiểm tra rowCount
      if (result.rowCount === 0) {
        return res.status(404).json({
          ok: false,
          message:
            "Không tìm thấy dữ liệu để cập nhật (Kiểm tra ID hoặc tên bảng)!",
        });
      }

      res.json({
        ok: true,
        message: `Thành công! Đã cập nhật ${result.rowCount} đối tượng.`,
      });
    } catch (e) {
      console.error("LỖI_SERVER_ADMIN:", e);
      res.status(500).json({ message: "Lỗi hệ thống: " + e.message });
    }
  },
);
router.get("/_ping", (req, res) => res.json({ ok: true, time: new Date() }));
module.exports = router;
