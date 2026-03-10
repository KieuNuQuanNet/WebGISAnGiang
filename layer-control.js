const BASE_CQL_PUBLISHED = "trang_thai_du_lieu='cong_bo'";

function capNhatLopWMS(layerWMS, chkMainId, subClassName, columnName) {
  const chkMain = document.getElementById(chkMainId);
  if (!chkMain || !chkMain.checked) {
    AppGIS.map.removeLayer(layerWMS);
    return;
  }

  if (!AppGIS.map.hasLayer(layerWMS)) AppGIS.map.addLayer(layerWMS);

  const cacOTick = document.querySelectorAll("." + subClassName + ":checked");
  const tongSoOPhu = document.querySelectorAll("." + subClassName).length;

  if (tongSoOPhu === 0) {
    if (BASE_CQL_PUBLISHED)
      layerWMS.setParams({ CQL_FILTER: BASE_CQL_PUBLISHED });
    else {
      delete layerWMS.wmsParams.CQL_FILTER;
      layerWMS.redraw();
    }
    return;
  }

  if (cacOTick.length === 0 || cacOTick.length === tongSoOPhu) {
    if (BASE_CQL_PUBLISHED)
      layerWMS.setParams({ CQL_FILTER: BASE_CQL_PUBLISHED });
    else {
      delete layerWMS.wmsParams.CQL_FILTER;
      layerWMS.redraw();
    }
    return;
  }

  const subOr = Array.from(cacOTick)
    .map((chk) => `${columnName} = '${chk.value}'`)
    .join(" OR ");

  const cqlString = BASE_CQL_PUBLISHED
    ? `(${BASE_CQL_PUBLISHED}) AND (${subOr})`
    : subOr;
  layerWMS.setParams({ CQL_FILTER: cqlString });
}

function dongBoCheckbox(chkMainId, subClassName, layerWMS, columnName) {
  var chkMain = document.getElementById(chkMainId);
  var subChks = document.querySelectorAll("." + subClassName);

  chkMain.addEventListener("change", function () {
    var isChecked = this.checked;
    subChks.forEach((chk) => (chk.checked = isChecked));
    capNhatLopWMS(layerWMS, chkMainId, subClassName, columnName);
  });

  subChks.forEach((chk) => {
    chk.addEventListener("change", function () {
      var anyChecked = document.querySelector("." + subClassName + ":checked");
      chkMain.checked = !!anyChecked;
      capNhatLopWMS(layerWMS, chkMainId, subClassName, columnName);
    });
  });
}

function kichHoat(chkMainId, subClassName, layerWMS, columnName) {
  dongBoCheckbox(chkMainId, subClassName, layerWMS, columnName);
  capNhatLopWMS(layerWMS, chkMainId, subClassName, columnName);
}

kichHoat("chkRung", "sub-rung", AppGIS.layers.rung, "loai_rung");
kichHoat("chkDat", "sub-dat", AppGIS.layers.dat, "loai_dat_su_dung");
kichHoat("chkNuoc", "sub-nuoc", AppGIS.layers.nuoc, "loai");
kichHoat(
  "chkKhoangSan",
  "sub-khoangsan",
  AppGIS.layers.khoangsan,
  "loai_khoang_san",
);
kichHoat("chkDongVat", "sub-dongvat", AppGIS.layers.dongvat, "muc_do_nguy_cap");
kichHoat("chkThucVat", "sub-thucvat", AppGIS.layers.thucvat, "muc_do_nguy_cap");

const TU_DIEN_COT = {
  ten: "Tên tài nguyên",
  ten_don_vi: "Tên mỏ / Đơn vị",
  ten_loai: "Tên loài sinh vật",
  nhom: "Nhóm",
  loai: "Loại",
  loai_rung: "Loại rừng",
  loai_khoang_san: "Loại khoáng sản",
  loai_dat_su_dung: "Loại đất",
  nhom_su_dung: "Nhóm sử dụng",
  tinh_trang: "Tình trạng",
  dien_tich: "Diện tích",
  dien_tich_ha: "Diện tích (Hecta)",
  dien_tich_m2: "Diện tích (m2)",
  tru_luong: "Trữ lượng",
  dia_chi: "Địa chỉ",
  doi_tuong_bao_ve: "Đối tượng bảo vệ",
  cap: "Cấp",
  phan_loai: "Phân loại",
  vi_tri_phan_bo: "Vị trí phân bố",
  muc_do_nguy_cap: "Mức độ nguy cấp",
  nguon_du_lieu: "Nguồn dữ liệu",
  nguon: "Nguồn tham khảo",
  trang_thai_du_lieu: "Trạng thái dữ liệu",
  ngay_tao: "Ngày tạo",
  nguoi_tao: "Người tạo",
  ngay_cap_nhat: "Ngày cập nhật",
  nguoi_cap_nhat: "Người cập nhật",
  ngay_phe_duyet: "Ngày phê duyệt",
  nguoi_phe_duyet: "Người phê duyệt",
  ngay_cong_bo: "Ngày công bố",
  nguoi_cong_bo: "Người công bố",
  ly_do_tu_choi: "Lý do từ chối",
};
const WF_SYSTEM_FIELDS = new Set([
  "trang_thai_du_lieu",
  "ngay_tao",
  "nguoi_tao",
  "ngay_cap_nhat",
  "nguoi_cap_nhat",
  "ngay_phe_duyet",
  "nguoi_phe_duyet",
  "ngay_cong_bo",
  "nguoi_cong_bo",
  "ly_do_tu_choi",
]);

const LAYER_META = {
  "angiang:khoangsan_diem_mo": {
    tieuDe: "Khoáng sản",
    layerObj: AppGIS.layers.khoangsan,
    chkMainId: "chkKhoangSan",
    subClass: "sub-khoangsan",
    columnName: "loai_khoang_san",
  },
  "angiang:rung": {
    tieuDe: "Rừng",
    layerObj: AppGIS.layers.rung,
    chkMainId: "chkRung",
    subClass: "sub-rung",
    columnName: "loai_rung",
  },
  "angiang:waterways": {
    tieuDe: "Nước",
    layerObj: AppGIS.layers.nuoc,
    chkMainId: "chkNuoc",
    subClass: "sub-nuoc",
    columnName: "loai",
  },
  "angiang:dat": {
    tieuDe: "Đất",
    layerObj: AppGIS.layers.dat,
    chkMainId: "chkDat",
    subClass: "sub-dat",
    columnName: "loai_dat_su_dung",
  },
  "angiang:dongvat": {
    tieuDe: "Động vật",
    layerObj: AppGIS.layers.dongvat,
    chkMainId: "chkDongVat",
    subClass: "sub-dongvat",
    columnName: "muc_do_nguy_cap",
  },
  "angiang:thucvat": {
    tieuDe: "Thực vật",
    layerObj: AppGIS.layers.thucvat,
    chkMainId: "chkThucVat",
    subClass: "sub-thucvat",
    columnName: "muc_do_nguy_cap",
  },
};

function getLayerMeta(typeName) {
  return LAYER_META[typeName] || null;
}

function damBaoLopWmsDangBat(typeName) {
  const meta = getLayerMeta(typeName);
  if (!meta) return null;

  const chkMain = document.getElementById(meta.chkMainId);
  if (!chkMain) return meta;

  if (!chkMain.checked) {
    chkMain.checked = true;
    document
      .querySelectorAll("." + meta.subClass)
      .forEach((c) => (c.checked = true));
  }

  capNhatLopWMS(meta.layerObj, meta.chkMainId, meta.subClass, meta.columnName);
  return meta;
}
