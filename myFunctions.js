/* ===== myFunctions.js : ملف الجافاسكريبت الوحيد، تُعرَّف فيه كل التوابع ===== */

/* ---------- تهيئة عامة لكل الصفحات ---------- */
function setActiveLink() {
  var path = window.location.pathname;
  var file = path.substring(path.lastIndexOf("/") + 1).toLowerCase();
  if (file === "") { file = "home.html"; }
  $(".nav a").each(function () {
    var href = $(this).attr("href");
    if (href && href.toLowerCase() === file) { $(this).addClass("active"); }
  });
}

function showToast(message) {
  var box = $("#toast");
  box.text(message).stop(true, true).fadeIn(200).delay(2200).fadeOut(300);
}

/* ---------- رسالة قصيرة ---------- */
function buildToast() {
  $("body").append('<div class="toast" id="toast"></div>');
}

/* ---------- نسخ رابط النشر (الصفحة الرئيسية) ---------- */
function copyPublishLink() {
  var url = $("#publishLink").attr("href");
  var done = function () { showToast("تم نسخ الرابط"); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done);
  } else {
    var temp = $("<input type='text' />").val(url).appendTo("body");
    temp[0].select();
    document.execCommand("copy");
    temp.remove();
    done();
  }
}

function initPage() {
  setActiveLink();
  buildToast();
  $("#page .hero, #page .card").hide().fadeIn(450);
  $("#copyLink").click(copyPublishLink);
}

/* ---------- صور السيارات ---------- */
/* الترتيب: صورة محلية images/CODE.jpg إن وُجدت، ثم ملف مباشر من ويكيميديا كومنز، ثم ويكيبيديا، ثم الرسم الافتراضي */
var COMMONS_FILES = {
  "CR-001": "2024 Toyota Corolla LE.jpg",
  "CR-002": "2022 Kia Sportage GT-Line ISG HEV Automatic 1.6 Front.jpg",
  "CR-003": "2021 Hyundai Elantra Ultimate, Front Left, 11-29-2020.jpg",
  "CR-004": "2021 Chevrolet Spark 1LT, front left, 11-15-2022.jpg",
  "CR-005": "Hyundai Tucson 1.6 T-GDI PHEV Prime (IV) \u2013 f 05072025.jpg"
};

var WIKI_TITLES = {
  "CR-001": ["Toyota_Corolla_(E210)", "Toyota_Corolla"],
  "CR-002": ["Kia_Sportage_(NQ5)", "Kia_Sportage"],
  "CR-003": ["Hyundai_Elantra_(CN7)", "Hyundai_Elantra"],
  "CR-004": ["Chevrolet_Spark"],
  "CR-005": ["Hyundai_Tucson_(NX4)", "Hyundai_Tucson"],
  "CR-006": ["Suzuki_Swift"]
};

function loadWikiPhoto(img, titles) {
  if (titles.length === 0) { return; }
  var url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + titles[0];
  $.getJSON(url).done(function (data) {
    if (data && data.thumbnail && data.thumbnail.source) {
      img.attr("src", data.thumbnail.source.replace(/\/\d+px-/, "/480px-"));
    } else {
      loadWikiPhoto(img, titles.slice(1));
    }
  }).fail(function () {
    loadWikiPhoto(img, titles.slice(1));
  });
}

function tryUrls(img, urls, fallback) {
  if (urls.length === 0) { fallback(); return; }
  var probe = new Image();
  probe.onload = function () { img.attr("src", urls[0]); };
  probe.onerror = function () { tryUrls(img, urls.slice(1), fallback); };
  probe.src = urls[0];
}

function loadCarPhoto(img, code) {
  var urls = ["images/" + code + ".jpg"];
  if (COMMONS_FILES[code]) {
    urls.push("https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(COMMONS_FILES[code]) + "?width=480");
  }
  tryUrls(img, urls, function () { loadWikiPhoto(img, WIKI_TITLES[code] || []); });
}

function loadAllPhotos() {
  $("img.thumb").each(function () {
    loadCarPhoto($(this), $(this).attr("id").replace("img-", ""));
  });
}

/* ---------- صفحة السيارات: التفاصيل والاختيار ---------- */
function toggleDetails(code, isOn) {
  var row = $("#d-" + code);
  if (isOn) {
    row.show().find(".details-box").hide().slideDown(250);
  } else {
    row.find(".details-box").slideUp(200, function () { row.hide(); });
  }
}

function getSelectedCars() {
  var cars = [];
  $("input.pick:checked").each(function () {
    var row = $(this).closest("tr");
    var priceText = row.find(".price").text().replace(/[^0-9]/g, "");
    cars.push({
      code: $(this).val(),
      model: row.find(".model").text(),
      price: parseInt(priceText, 10)
    });
  });
  return cars;
}

function refreshSelectedList() {
  var cars = getSelectedCars();
  var names = [];
  for (var i = 0; i < cars.length; i++) { names.push(cars[i].model); }
  $("#selectedList").text(names.join(" ، "));
  return cars;
}

function showBookingForm() {
  var cars = refreshSelectedList();
  if (cars.length === 0) {
    $("#selectionNote").text("اختر سيارة واحدة على الأقل قبل المتابعة.");
    $("#bookingSection").slideUp(200);
    return;
  }
  $("#selectionNote").text("");
  $("#bookingSection").slideDown(350, function () {
    $("html, body").animate({ scrollTop: $("#bookingSection").offset().top - 20 }, 350);
  });
}

/* ---------- المساعد الذكي لاختيار السيارة ---------- */
function toLatinDigits(text) {
  return text.replace(/[\u0660-\u0669]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); });
}

function parseRequest(raw) {
  var t = toLatinDigits(raw);
  var req = { people: null, budget: null };

  var p = /(\d+)\s*(?:اشخاص|أشخاص|شخص|ركاب|راكب|افراد|أفراد|فرد)/.exec(t);
  if (p) { req.people = parseInt(p[1], 10); t = t.replace(p[0], " "); }
  else if (/عائلة|عائلي|عيلة|أسرة|اسرة/.test(t)) { req.people = 5; }

  var b = /(\d+(?:\.\d+)?)\s*(ألف|الف|آلاف|الاف|مليون)?/.exec(t);
  if (b) {
    var value = parseFloat(b[1]);
    if (b[2]) { value = value * (b[2] === "مليون" ? 1000000 : 1000); }
    if (value >= 50000) { req.budget = Math.round(value); }
  }

  req.economy = /اقتصاد|توفير|رخيص|أرخص|ارخص|موفر/.test(t);
  req.comfort = /سفر|رحلة|طريق|طويل|مريح|فخم|عائلة|عائلي|أسرة|اسرة/.test(t);
  req.city = /مدينة|داخل|زحمة|ركن|صغير|ضيق/.test(t);
  req.auto = /أوتوماتيك|اوتوماتيك|اوتماتيك/.test(t);
  req.manual = /يدوي|عادي/.test(t);
  req.hybrid = /هجين|هايبرد/.test(t);
  req.fresh = /حديث|جديد/.test(t);
  return req;
}

function readCatalog() {
  var cars = [];
  $("tr.car-row").each(function () {
    var row = $(this);
    var code = row.find("input.pick").val();
    var box = $("#d-" + code);
    cars.push({
      code: code,
      model: row.find(".model").text(),
      year: parseInt(row.find(".year").text(), 10),
      price: parseInt(row.find(".price").text().replace(/[^0-9]/g, ""), 10),
      seats: parseInt(box.find(".chip-seats .v").text(), 10),
      gear: box.find(".chip-gear .v").text(),
      fuel: box.find(".chip-fuel .v").text(),
      src: row.find("img.thumb").attr("src")
    });
  });
  return cars;
}

function rankCars(req, catalog) {
  var maxPrice = 0, i;
  for (i = 0; i < catalog.length; i++) { if (catalog[i].price > maxPrice) { maxPrice = catalog[i].price; } }

  var pool = [];
  for (i = 0; i < catalog.length; i++) {
    if (req.people === null || catalog[i].seats >= req.people) { pool.push(catalog[i]); }
  }
  var note = "";
  if (req.budget !== null) {
    var within = [];
    for (i = 0; i < pool.length; i++) { if (pool[i].price <= req.budget) { within.push(pool[i]); } }
    if (within.length > 0) { pool = within; }
    else { note = "لا توجد سيارة ضمن الميزانية المذكورة، وهذه أقرب الخيارات."; }
  }

  var scored = [];
  for (i = 0; i < pool.length; i++) {
    var c = pool[i], score = (c.year - 2020) * 0.3, why = [];
    if (req.people !== null) { why.push("تتسع لـ " + c.seats + " ركاب"); }
    if (req.budget !== null && c.price <= req.budget) { score += (c.price / req.budget) * 1.5; why.push("ضمن ميزانيتك"); }
    if (req.economy) { score += ((maxPrice - c.price) / maxPrice) * 4; why.push("سعرها اليومي منخفض"); }
    if (req.comfort) { score += (c.year - 2020) * 0.6 + (c.price / maxPrice) * 2 + (c.seats >= 5 ? 1 : 0); why.push("مريحة للسفر وموديلها " + c.year); }
    if (req.city) { score += ((maxPrice - c.price) / maxPrice) * 2 + (c.seats <= 4 ? 1.5 : 0); why.push("مناسبة للتنقل داخل المدينة"); }
    if (req.auto && c.gear === "أوتوماتيك") { score += 2; why.push("ناقل حركة أوتوماتيك"); }
    if (req.manual && c.gear === "يدوي") { score += 2; why.push("ناقل حركة يدوي"); }
    if (req.hybrid && c.fuel === "هجين") { score += 2; why.push("محرك هجين موفّر للوقود"); }
    if (req.fresh) { score += (c.year - 2020) * 0.8; why.push("موديل حديث (" + c.year + ")"); }
    if (why.length === 0) { why.push("خيار متوازن بين السعر والموديل"); }
    scored.push({ car: c, score: score, why: why });
  }
  scored.sort(function (a, b) { return b.score - a.score; });
  return { list: scored.slice(0, 3), note: note };
}

function renderAdvice(result) {
  var box = $("#advisorResults");
  if (result.list.length === 0) {
    box.html("<p class='advisor-summary'>لا توجد سيارة تناسب عدد الركاب المذكور. جرّب تقليل العدد.</p>");
    box.fadeIn(200);
    return;
  }
  var html = "<p class='advisor-summary'>" + (result.note || "أفضل الخيارات لطلبك:") + "</p><div class='rec-list'>";
  for (var i = 0; i < result.list.length; i++) {
    var r = result.list[i], items = "";
    for (var k = 0; k < r.why.length; k++) { items += "<li>" + r.why[k] + "</li>"; }
    html += "<div class='rec'><img src='" + r.car.src + "' alt='" + r.car.model + "' />" +
            "<div class='rec-body'><h3>" + r.car.model + (i === 0 ? " <span class='rec-rank'>الأنسب</span>" : "") + "</h3>" +
            "<div class='price'>" + formatMoney(r.car.price) + " / يوم</div><ul>" + items + "</ul>" +
            "<button type='button' class='btn gold pick-rec' value='" + r.car.code + "'>اختيار</button></div></div>";
  }
  box.html(html + "</div>").hide().fadeIn(250);
}

function runAdvisor() {
  var text = $.trim($("#advisorInput").val());
  if (text === "") { showToast("اكتب احتياجك أولاً"); return; }
  renderAdvice(rankCars(parseRequest(text), readCatalog()));
}

function pickRecommended(code) {
  var box = $("#pick-" + code);
  box.prop("checked", true).trigger("change");
  var row = box.closest("tr");
  row.addClass("flash");
  setTimeout(function () { row.removeClass("flash"); }, 1500);
  $("html, body").animate({ scrollTop: row.offset().top - 120 }, 350);
  showToast("أُضيفت السيارة إلى اختياراتك، اضغط «متابعة»");
}

/* ---------- أدوات التحقق ---------- */
function setError(fieldId, message) {
  $("#" + fieldId).removeClass("valid").addClass("invalid");
  $("#err-" + fieldId).text(message);
}

function setOk(fieldId) {
  var input = $("#" + fieldId);
  input.removeClass("invalid");
  if ($.trim(input.val()) !== "") { input.addClass("valid"); } else { input.removeClass("valid"); }
  $("#err-" + fieldId).text("");
}

/* الاسم: أحرف عربية فقط، كلمتان على الأقل، والحقل اختياري */
function validateName() {
  var value = $.trim($("#fullName").val());
  if (value === "") { setOk("fullName"); return true; }
  if (!/^[\u0621-\u064A]+(\s+[\u0621-\u064A]+)+$/.test(value)) {
    setError("fullName", "أدخل الاسم الكامل بأحرف عربية فقط (كلمتان على الأقل).");
    return false;
  }
  setOk("fullName");
  return true;
}

/* الرقم الوطني: إلزامي، 11 خانة، أول خانتين من 01 إلى 14 */
function validateNationalId() {
  var value = $.trim($("#nationalId").val());
  if (value === "") { setError("nationalId", "الرقم الوطني إلزامي."); return false; }
  if (!/^[0-9]{11}$/.test(value)) { setError("nationalId", "يجب أن يتكوّن من 11 رقماً."); return false; }
  var province = parseInt(value.substring(0, 2), 10);
  if (province < 1 || province > 14) {
    setError("nationalId", "أول خانتين تمثلان المحافظة وتكونان بين 01 و 14.");
    return false;
  }
  setOk("nationalId");
  return true;
}

/* تحويل النص dd-mm-yyyy إلى تاريخ، ويعيد null عند عدم الصحة */
function parseDate(text) {
  var m = /^([0-9]{2})-([0-9]{2})-([0-9]{4})$/.exec(text);
  if (m === null) { return null; }
  var d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
  var date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) { return null; }
  return date;
}

function validateStart() {
  var text = $.trim($("#startDate").val());
  if (text === "") { setError("startDate", "تاريخ البداية إلزامي."); return false; }
  if (parseDate(text) === null) { setError("startDate", "تاريخ غير صحيح. الصيغة المطلوبة dd-mm-yyyy."); return false; }
  setOk("startDate");
  return true;
}

function validateEnd() {
  var text = $.trim($("#endDate").val());
  if (text === "") { setError("endDate", "تاريخ النهاية إلزامي."); return false; }
  var end = parseDate(text);
  if (end === null) { setError("endDate", "تاريخ غير صحيح. الصيغة المطلوبة dd-mm-yyyy."); return false; }
  var start = parseDate($.trim($("#startDate").val()));
  if (start !== null && end.getTime() <= start.getTime()) {
    setError("endDate", "يجب أن يكون تاريخ النهاية لاحقاً لتاريخ البداية.");
    return false;
  }
  setOk("endDate");
  return true;
}

function validateDates() {
  var a = validateStart();
  var b = validateEnd();
  return a && b;
}

/* الموبايل: Syriatel (093 / 098 / 099) و MTN (094 / 095 / 096)، والحقل اختياري */
function validateMobile() {
  var value = $.trim($("#mobile").val()).replace(/[\s-]/g, "");
  if (value === "") { setOk("mobile"); return true; }
  if (!/^(?:\+963|00963|0)?(93|98|99|94|95|96)[0-9]{7}$/.test(value)) {
    setError("mobile", "رقم غير مطابق لشبكتي Syriatel (093، 098، 099) أو MTN (094، 095، 096).");
    return false;
  }
  setOk("mobile");
  return true;
}

function validateEmail() {
  var value = $.trim($("#email").val());
  if (value === "") { setOk("email"); return true; }
  if (!/^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(value)) {
    setError("email", "صيغة البريد الإلكتروني غير صحيحة.");
    return false;
  }
  setOk("email");
  return true;
}

/* ---------- تنسيق الإدخال أثناء الكتابة ---------- */
function maskDigits(input, maxLen) {
  input.val(input.val().replace(/\D/g, "").substring(0, maxLen));
}

function maskDate(input) {
  var d = input.val().replace(/\D/g, "").substring(0, 8);
  var out = d.substring(0, 2);
  if (d.length > 2) { out += "-" + d.substring(2, 4); }
  if (d.length > 4) { out += "-" + d.substring(4, 8); }
  input.val(out);
}

/* ---------- الحساب وعرض النتيجة ---------- */
function formatMoney(n) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " ل.س";
}

function showResult() {
  var cars = getSelectedCars();
  var start = parseDate($.trim($("#startDate").val()));
  var end = parseDate($.trim($("#endDate").val()));
  var days = Math.round((end.getTime() - start.getTime()) / 86400000);

  var rows = "";
  var total = 0;
  for (var i = 0; i < cars.length; i++) {
    var sub = cars[i].price * days;
    total += sub;
    rows += "<tr><td>" + cars[i].code + " - " + cars[i].model + "</td>" +
            "<td>" + formatMoney(cars[i].price) + "</td>" +
            "<td>" + days + "</td>" +
            "<td>" + formatMoney(sub) + "</td></tr>";
  }

  var discount = 0;
  if (days > 7) { discount = Math.round(total * 0.10); }

  $("#resultRows").html(rows);
  $("#resTotal").text(formatMoney(total));
  $("#resDiscount").text(discount > 0 ? "- " + formatMoney(discount) : "لا يوجد (المدة 7 أيام أو أقل)");
  $("#resFinal").text(formatMoney(total - discount));
  $("#resPeriod").text($.trim($("#startDate").val()) + "  إلى  " + $.trim($("#endDate").val()) + "  (" + days + " يوم)");
  $("#resultOverlay").css("display", "flex").hide().fadeIn(250);
}

function closeResult() {
  $("#resultOverlay").fadeOut(200);
}

function submitBooking() {
  var results = [validateName(), validateNationalId(), validateDates(), validateMobile(), validateEmail()];
  var allValid = true;
  for (var i = 0; i < results.length; i++) {
    if (!results[i]) { allValid = false; }
  }
  if (!allValid) {
    $(".invalid").first().focus();
    return;
  }
  showResult();
}

function resetBooking() {
  $("#bookingForm")[0].reset();
  $("#bookingForm input").removeClass("valid invalid");
  $(".error-msg").text("");
}

/* ---------- ربط الأحداث ---------- */
function bindRevalidate(selector, validator) {
  $(selector).on("input", function () {
    if ($(this).hasClass("invalid")) { validator(); }
  });
}

function initCarsPage() {
  loadAllPhotos();

  $("input.show-details").change(function () {
    toggleDetails($(this).val(), $(this).is(":checked"));
  });
  $("input.pick").change(function () {
    $(this).closest("tr").toggleClass("picked", $(this).is(":checked"));
    if ($("#bookingSection").is(":visible")) { refreshSelectedList(); }
  });
  $("#continueBtn").click(showBookingForm);

  $("#advisorForm").submit(function (e) { e.preventDefault(); runAdvisor(); });
  $(".example-chip").click(function () {
    $("#advisorInput").val($(this).text());
    runAdvisor();
  });
  $("#advisorResults").on("click", ".pick-rec", function () { pickRecommended($(this).val()); });

  $("#nationalId").on("input", function () { maskDigits($(this), 11); });
  $("#startDate, #endDate").on("input", function () { maskDate($(this)); });
  $("#mobile").on("input", function () { $(this).val($(this).val().replace(/[^0-9+\s-]/g, "")); });

  $("#fullName").blur(validateName);
  $("#nationalId").blur(validateNationalId);
  $("#startDate").blur(function () {
    validateStart();
    if ($.trim($("#endDate").val()) !== "") { validateEnd(); }
  });
  $("#endDate").blur(validateEnd);
  $("#mobile").blur(validateMobile);
  $("#email").blur(validateEmail);
  bindRevalidate("#fullName", validateName);
  bindRevalidate("#nationalId", validateNationalId);
  bindRevalidate("#startDate", validateStart);
  bindRevalidate("#endDate", validateEnd);
  bindRevalidate("#mobile", validateMobile);
  bindRevalidate("#email", validateEmail);

  $("#bookingForm").submit(function (e) {
    e.preventDefault();
    submitBooking();
  });
  $("#closeResult").click(closeResult);
  $("#newBooking").click(function () { closeResult(); resetBooking(); });
  $("#resultOverlay").click(function (e) {
    if (e.target === this) { closeResult(); }
  });
}

$(document).ready(function () {
  initPage();
  if ($("#carsForm").length > 0) { initCarsPage(); }
});
