

<script setup>

import { ref, computed, onMounted } from 'vue'

import html2pdf from 'html2pdf.js'

import { Filesystem, Directory } from '@capacitor/filesystem'

import { Share } from '@capacitor/share'

import { Printer } from '@capgo/capacitor-printer'

const props = defineProps({

  customerId: {

    type: [String, Number],

    required: true

  }

})

const emit = defineEmits(['create-invoice'])

const customers = ref([])

const invoices = ref([])

const paymentInvoiceId = ref(null)

const paymentAmount = ref('')

const isEditingCustomer = ref(false)

const editCustomerName = ref('')

const editCustomerPhone = ref('')

const customer = computed(() =>

  customers.value.find(

    c => String(c.id) === String(props.customerId)

  )

)

const totalInvoices = computed(() =>

  invoices.value.reduce(

    (sum, invoice) => sum + Number(invoice.total || 0),

    0

  )

)

const totalPaid = computed(() =>

  invoices.value.reduce(

    (sum, invoice) => sum + Number(invoice.paid || 0),

    0

  )

)

const balance = computed(() =>

  invoices.value.reduce(

    (sum, invoice) => sum + Number(invoice.remaining || 0),

    0

  )

)

function loadData() {

  try {

    customers.value = JSON.parse(

      localStorage.getItem('hesabaty_customers') || '[]'

    )

    invoices.value = JSON.parse(

      localStorage.getItem(

        `hesabaty_invoices_${props.customerId}`

      ) || '[]'

    ).sort((a, b) =>

      new Date(`${b.date}T${b.time}`) -

      new Date(`${a.date}T${a.time}`)

    )

  } catch {

    customers.value = []

    invoices.value = []

  }

}

onMounted(loadData)

function startCustomerEdit() {

  if (!customer.value) return

  editCustomerName.value = customer.value.name || ''

  editCustomerPhone.value = customer.value.phone || ''

  isEditingCustomer.value = true

}

function cancelCustomerEdit() {

  isEditingCustomer.value = false

  editCustomerName.value = ''

  editCustomerPhone.value = ''

}

function saveCustomerEdit() {

  const name = editCustomerName.value.trim()

  const phone = editCustomerPhone.value.trim()

  if (!name) {

    alert('من فضلك اكتب اسم العميل')

    return

  }

  const updatedCustomers = customers.value.map(item =>

    String(item.id) === String(props.customerId)

      ? { ...item, name, phone }

      : item

  )

  try {

    localStorage.setItem('hesabaty_customers', JSON.stringify(updatedCustomers))

    customers.value = updatedCustomers

    cancelCustomerEdit()

    alert('تم تحديث بيانات العميل بنجاح')

  } catch {

    alert('تعذر حفظ بيانات العميل. حاول مرة أخرى')

  }

}

function formatDate(date) {

  if (!date) return ''

  return new Date(`${date}T00:00:00`)

    .toLocaleDateString('ar-EG')

}

function getPayments(invoice) {

  if (Array.isArray(invoice.payments)) {

    return invoice.payments

  }

  return Number(invoice.paid || 0) > 0

    ? [{ amount: Number(invoice.paid) }]

    : []

}

function startPayment(invoice) {

  paymentInvoiceId.value = invoice.id

  paymentAmount.value = ''

}

function cancelPayment() {

  paymentInvoiceId.value = null

  paymentAmount.value = ''

}

function savePayment(invoice) {

  const amount = Number(paymentAmount.value)

  const remaining = Number(invoice.remaining || 0)

  if (!Number.isFinite(amount) || amount <= 0) {

    alert('من فضلك أدخل مبلغًا صحيحًا أكبر من صفر')

    return

  }

  if (amount > remaining) {

    alert('المبلغ المدفوع أكبر من المديونية المتبقية')

    return

  }

  const currentPayments = getPayments(invoice)

  const updatedInvoices = invoices.value.map(item => {

    if (String(item.id) !== String(invoice.id)) {

      return item

    }

    return {

      ...item,

      paid: Number(item.paid || 0) + amount,

      remaining: Math.max(0, remaining - amount),

      payments: [

        ...currentPayments,

        { amount }

      ]

    }

  })

  try {

    localStorage.setItem(

      `hesabaty_invoices_${props.customerId}`,

      JSON.stringify(updatedInvoices)

    )

    invoices.value = updatedInvoices

    const updatedBalance = updatedInvoices.reduce(

      (sum, item) => sum + Number(item.remaining || 0),

      0

    )

    const updatedCustomers = customers.value.map(item =>

      String(item.id) === String(props.customerId)

        ? { ...item, balance: updatedBalance }

        : item

    )

    localStorage.setItem(

      'hesabaty_customers',

      JSON.stringify(updatedCustomers)

    )

    customers.value = updatedCustomers

    cancelPayment()

    alert('تم تسجيل الدفعة بنجاح')

  } catch {

    alert('تعذر حفظ الدفعة. حاول مرة أخرى')

  }

}

function deleteInvoice(invoice) {

  if (Number(invoice.remaining || 0) !== 0) {

    alert('لا يمكن حذف فاتورة عليها مديونية')

    return

  }

  const confirmed = confirm(

    `هل أنت متأكد من حذف الفاتورة ${invoice.number}؟`

  )

  if (!confirmed) return

  const updatedInvoices = invoices.value.filter(

    item => String(item.id) !== String(invoice.id)

  )

  const updatedBalance = updatedInvoices.reduce(

    (sum, item) => sum + Number(item.remaining || 0),

    0

  )

  const updatedCustomers = customers.value.map(item =>

    String(item.id) === String(props.customerId)

      ? { ...item, balance: updatedBalance }

      : item

  )

  try {

    localStorage.setItem(

      `hesabaty_invoices_${props.customerId}`,

      JSON.stringify(updatedInvoices)

    )

    localStorage.setItem(

      'hesabaty_customers',

      JSON.stringify(updatedCustomers)

    )

    invoices.value = updatedInvoices

    customers.value = updatedCustomers

    alert('تم حذف الفاتورة بنجاح')

  } catch {

    alert('تعذر حذف الفاتورة. حاول مرة أخرى')

  }

}

const storeProfile = ref({})

const previewInvoice = ref(null)

function loadStoreProfile() {

  try {

    storeProfile.value = JSON.parse(

      localStorage.getItem('hesabaty_store_profile') || '{}'

    )

  } catch {

    storeProfile.value = {}

  }

}

function openInvoicePreview(invoice) {

  loadStoreProfile()

  previewInvoice.value = invoice

}

function closeInvoicePreview() {

  previewInvoice.value = null

}

async function createInvoicePdf() {

  const element = document.getElementById('invoice-to-pdf')

  if (!element) {

    throw new Error('لم يتم العثور على الفاتورة')

  }

  const invoiceNumber = previewInvoice.value?.number || 'invoice'

  const options = {

    margin: 8,

    filename: `فاتورة-${invoiceNumber}.pdf`,

    image: {

      type: 'jpeg',

      quality: 0.98

    },

    html2canvas: {

      scale: 2,

      useCORS: true,

      backgroundColor: '#ffffff'

    },

    jsPDF: {

      unit: 'mm',

      format: 'a4',

      orientation: 'portrait'

    },

    pagebreak: {

      mode: ['css', 'legacy']

    }

  }

  return html2pdf()

    .set(options)

    .from(element)

    .outputPdf('blob')

}

async function savePdfToDevice(blob, fileName) {

  const base64 = await new Promise((resolve, reject) => {

    const reader = new FileReader()

    reader.onloadend = () => {

      const result = reader.result

      if (typeof result !== 'string') {

        reject(new Error('تعذر تحويل PDF'))

        return

      }

      resolve(result.split(',')[1])

    }

    reader.onerror = reject

    reader.readAsDataURL(blob)

  })

  const saved = await Filesystem.writeFile({

    path: fileName,

    data: base64,

    directory: Directory.Cache,

    recursive: true

  })

  const uri = await Filesystem.getUri({

    path: fileName,

    directory: Directory.Cache

  })

  return {

    uri: uri.uri || saved.uri,

    fileName

  }

}

async function shareInvoicePdf() {

  try {

    if (!previewInvoice.value) return

    const invoiceNumber = previewInvoice.value.number || 'invoice'

    const fileName = `فاتورة-${invoiceNumber}.pdf`

    const blob = await createInvoicePdf()

    const file = await savePdfToDevice(blob, fileName)

    await Share.share({

      title: `فاتورة ${invoiceNumber}`,

      text: `فاتورة رقم ${invoiceNumber}`,

      files: [file.uri],

      dialogTitle: 'مشاركة الفاتورة'

    })

  } catch (error) {

    console.error('PDF Share Error:', error)

    alert('تعذر مشاركة الفاتورة كملف PDF')

  }

}

async function printInvoice() {

  try {

    if (!previewInvoice.value) return

    const invoiceNumber = previewInvoice.value.number || 'invoice'

    // إنشاء PDF الفاتورة
    const blob = await createInvoicePdf()

    // تحويل الـ PDF إلى Base64 وفتحه في واجهة طباعة Android الأصلية.
    // من شاشة الطباعة يقدر المستخدم يطبع أو يختار Save as PDF.
    const base64 = await new Promise((resolve, reject) => {

      const reader = new FileReader()

      reader.onloadend = () => {

        const result = reader.result

        if (typeof result !== 'string') {

          reject(new Error('تعذر تحويل الفاتورة إلى PDF'))

          return

        }

        const commaIndex = result.indexOf(',')

        if (commaIndex === -1) {

          reject(new Error('بيانات PDF غير صالحة'))

          return

        }

        resolve(result.slice(commaIndex + 1))

      }

      reader.onerror = () => {
        reject(new Error('تعذر قراءة ملف PDF'))
      }

      reader.readAsDataURL(blob)

    })

    await Printer.printBase64({

      name: `فاتورة ${invoiceNumber}`,

      data: base64,

      mimeType: 'application/pdf'

    })

  } catch (error) {

    console.error('Print Error:', error)

    alert(
      'تعذر فتح صفحة الطباعة: ' +
      (error?.message || 'حدث خطأ غير معروف')
    )

  }

}

function money(value) {

  return Number(value || 0).toLocaleString('ar-EG', {

    minimumFractionDigits: 0,

    maximumFractionDigits: 2

  })

}

function buildInvoiceShareText(invoice) {

  const lines = [

    `فاتورة ${invoice.number || ''}`,

    `المحل: ${storeProfile.value.name || 'حساباتي'}`,

    `العميل: ${customer.value?.name || ''}`,

    `التاريخ: ${formatDate(invoice.date)}${invoice.time ? ` - ${invoice.time}` : ''}`,

    '',

    'الأصناف:',

    ...(invoice.items || []).map((item, index) =>

      `${index + 1}. ${item.name} × ${item.quantity} = ${money(item.lineTotal ?? (Number(item.price || 0) * Number(item.quantity || 0)))} ج.م`

    ),

    '',

    `الإجمالي: ${money(invoice.total)} ج.م`,

    `المدفوع: ${money(invoice.paid)} ج.م`,

    `المتبقي: ${money(invoice.remaining)} ج.م`,

    '',

    'شكرًا لتعاملكم معنا ❤️'

  ]

  return lines.join('\n')

}

async function shareInvoice(invoice) {

  const text = buildInvoiceShareText(invoice)

  // على أندرويد/الموبايل: استخدم نافذة المشاركة الأصلية إن كانت متاحة.

  if (navigator.share) {

    try {

      await navigator.share({

        title: `فاتورة ${invoice.number || ''}`,

        text

      })

      return

    } catch (error) {

      if (error?.name === 'AbortError') return

    }

  }

  // fallback سريع ومباشر لواتساب، ويعمل أيضًا على الكمبيوتر.

  const phone = String(customer.value?.phone || '').replace(/[^0-9+]/g, '')

  let normalizedPhone = phone.replace(/^\+/, '')

  if (normalizedPhone.startsWith('01') && normalizedPhone.length === 11) {

    normalizedPhone = `20${normalizedPhone.slice(1)}`

  }

  const url = normalizedPhone

    ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(text)}`

    : `https://wa.me/?text=${encodeURIComponent(text)}`

  window.open(url, '_blank', 'noopener,noreferrer')

}

</script>

<template>

  <div class="details-page" dir="rtl">

    <div v-if="customer">

      <div class="customer-header">

        <div class="avatar">{{ customer.name.charAt(0) }}</div>

        <div class="customer-heading">

          <h2>{{ customer.name }}</h2>

          <p>{{ customer.phone || 'لا يوجد رقم هاتف' }}</p>

        </div>

        <button class="edit-customer-btn" @click="startCustomerEdit">تعديل البيانات</button>

      </div>

      <div v-if="isEditingCustomer" class="customer-edit-card">

        <div class="customer-edit-header">

          <h3>تعديل بيانات العميل</h3>

          <p>عدّل الاسم أو أضف رقم الهاتف أو غيّره أو احذفه في أي وقت.</p>

        </div>

        <label class="edit-field">

          <span>اسم العميل</span>

          <input v-model="editCustomerName" type="text" placeholder="اسم العميل" autocomplete="name" />

        </label>

        <label class="edit-field">

          <span>رقم الهاتف <small>(اختياري)</small></span>

          <input v-model="editCustomerPhone" type="tel" inputmode="tel" placeholder="رقم الهاتف" autocomplete="tel" />

        </label>

        <div class="customer-edit-actions">

          <button class="save-customer-btn" @click="saveCustomerEdit">حفظ التعديلات</button>

          <button class="cancel-customer-btn" @click="cancelCustomerEdit">إلغاء</button>

        </div>

      </div>

      <div class="balance-card">

        <span>المديونية الحالية</span>

        <strong>

          {{ balance.toLocaleString('ar-EG') }} ج.م

        </strong>

      </div>

      <div class="stats">

        <div class="stat-card">

          <span>إجمالي الفواتير</span>

          <strong>

            {{ totalInvoices.toLocaleString('ar-EG') }} ج.م

          </strong>

        </div>

        <div class="stat-card">

          <span>إجمالي المدفوع</span>

          <strong>

            {{ totalPaid.toLocaleString('ar-EG') }} ج.م

          </strong>

        </div>

      </div>

      <button

        class="create-btn"

        @click="emit('create-invoice', customer.id)"

      >

        + إنشاء فاتورة جديدة

      </button>

      <section class="invoice-section">

        <h3>فواتير العميل</h3>

        <div v-if="invoices.length === 0" class="empty">

          لا توجد فواتير لهذا العميل حتى الآن

        </div>

        <div

          v-for="invoice in invoices"

          :key="invoice.id"

          class="invoice-card"

        >

          <div class="invoice-top">

            <strong>{{ invoice.number }}</strong>

            <span>

              {{ formatDate(invoice.date) }} - {{ invoice.time }}

            </span>

          </div>

          <div class="invoice-row">

            <span>إجمالي الفاتورة</span>

            <strong>

              {{ Number(invoice.total || 0).toLocaleString('ar-EG') }} ج.م

            </strong>

          </div>

          <div class="invoice-row">

            <span>إجمالي المدفوع</span>

            <strong>

              {{ Number(invoice.paid || 0).toLocaleString('ar-EG') }} ج.م

            </strong>

          </div>

          <div class="invoice-row remaining">

            <span>المتبقي</span>

            <strong>

              {{ Number(invoice.remaining || 0).toLocaleString('ar-EG') }} ج.م

            </strong>

          </div>

          <div

            class="invoice-status"

            :class="{ settled: Number(invoice.remaining || 0) === 0 }"

          >

            {{

              Number(invoice.remaining || 0) === 0

                ? 'مدفوعة بالكامل'

                : 'عليها مديونية'

            }}

          </div>

          <div class="payments-section">

            <h4>سجل الدفعات</h4>

            <div

              v-if="getPayments(invoice).length === 0"

              class="no-payments"

            >

              لم يتم تسجيل أي دفعات

            </div>

            <div

              v-for="(payment, index) in getPayments(invoice)"

              :key="index"

              class="payment-row"

            >

              <span>الدفعة {{ index + 1 }}</span>

              <strong>

                {{ Number(payment.amount || 0).toLocaleString('ar-EG') }} ج.م

              </strong>

            </div>

          </div>

          <div

            v-if="paymentInvoiceId === invoice.id"

            class="payment-box"

          >

            <label>

              المبلغ اللي دفعه العميل

              <input

                v-model="paymentAmount"

                type="number"

                min="0.01"

                :max="invoice.remaining"

                step="0.01"

                placeholder="اكتب المبلغ"

              />

            </label>

            <div class="payment-actions">

              <button

                class="save-btn"

                @click="savePayment(invoice)"

              >

                تأكيد الدفع

              </button>

              <button

                class="cancel-btn"

                @click="cancelPayment"

              >

                إلغاء

              </button>

            </div>

          </div>

          <button

            v-else-if="Number(invoice.remaining || 0) > 0"

            class="payment-btn"

            @click="startPayment(invoice)"

          >

            + تسجيل دفعة

          </button>

          <button

            v-if="Number(invoice.remaining || 0) === 0"

            class="delete-invoice-btn"

            @click="deleteInvoice(invoice)"

          >

            حذف الفاتورة

          </button>

          <button class="preview-invoice-btn" @click="openInvoicePreview(invoice)">معاينة الفاتورة / طباعة PDF</button>

            <details class="invoice-details">

            <summary>عرض تفاصيل الأصناف</summary>

            <div

              v-for="(item, index) in invoice.items || []"

              :key="index"

              class="item-row"

            >

              <span>

                {{ item.name }} × {{ item.quantity }}

              </span>

              <strong>

                {{ Number(item.lineTotal || 0).toLocaleString('ar-EG') }} ج.م

              </strong>

            </div>

          </details>

        </div>

      </section>

    </div>

    <div v-else class="empty">

      العميل غير موجود

    </div>

  </div>

    <div v-if="previewInvoice" class="preview-overlay" @click.self="closeInvoicePreview">

      <div class="preview-dialog" dir="rtl">

        <div class="preview-toolbar no-print">

          <strong>معاينة الفاتورة</strong>

          <div class="preview-toolbar-actions">

  <button class="print-btn" @click="printInvoice">

    🖨️ طباعة

  </button>

  <button class="share-pdf-btn" @click="shareInvoicePdf">

    📄 مشاركة PDF

  </button>

  <button class="close-preview-btn" @click="closeInvoicePreview">

    إغلاق

  </button>

</div>

        </div>

        <div id="invoice-to-pdf" class="printable-invoice">

          <header class="print-shop-header">

            <img v-if="storeProfile.logo" :src="storeProfile.logo" alt="شعار المحل" class="print-shop-logo" />

            <div class="print-shop-info">

              <h1>{{ storeProfile.name || 'اسم المحل' }}</h1>

              <p v-if="storeProfile.phone">هاتف: {{ storeProfile.phone }}</p>

              <p v-if="storeProfile.address">العنوان: {{ storeProfile.address }}</p>

            </div>

          </header>

          <div class="print-invoice-title">

            <h2>فاتورة مبيعات</h2>

            <strong>{{ previewInvoice.number }}</strong>

          </div>

          <section class="print-customer-info">

            <div><span>العميل:</span> {{ customer?.name || '—' }}</div>

            <div><span>الهاتف:</span> {{ customer?.phone || '—' }}</div>

            <div><span>التاريخ:</span> {{ formatDate(previewInvoice.date) }}</div>

            <div><span>الوقت:</span> {{ previewInvoice.time || '—' }}</div>

          </section>

          <table class="print-items-table">

            <thead>

              <tr><th>#</th><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr>

            </thead>

            <tbody>

              <tr v-for="(item, index) in previewInvoice.items || []" :key="index">

                <td>{{ index + 1 }}</td>

                <td>{{ item.name }}</td>

                <td>{{ item.quantity }}</td>

                <td>{{ money(item.price) }} ج.م</td>

                <td>{{ money(item.lineTotal) }} ج.م</td>

              </tr>

            </tbody>

          </table>

          <section class="print-totals">

            <div><span>إجمالي الفاتورة</span><strong>{{ money(previewInvoice.total) }} ج.م</strong></div>

            <div><span>المدفوع</span><strong>{{ money(previewInvoice.paid) }} ج.م</strong></div>

            <div class="print-remaining"><span>المتبقي</span><strong>{{ money(previewInvoice.remaining) }} ج.م</strong></div>

          </section>

          <footer class="print-footer">شكرًا لتعاملكم معنا</footer>

        </div>

      </div>

    </div>

</template>

<style scoped>

.details-page {

  padding: 18px;

  color: #172b4d;

}

.customer-heading { min-width: 0; flex: 1; }

.edit-customer-btn { flex: 0 0 auto; background: #eaf7f5; color: #0f766e; border: 1px solid #c8ebe6; border-radius: 10px; padding: 10px 12px; font-weight: 800; font-size: 12px; }

.customer-edit-card { background: #fff; border: 1px solid #e6ebf2; border-radius: 16px; padding: 16px; margin: -4px 0 16px; box-shadow: 0 8px 24px rgba(15,23,42,.06); }

.customer-edit-header h3 { margin: 0 0 5px; font-size: 16px; }

.customer-edit-header p { margin: 0 0 15px; color: #7b879b; font-size: 12px; line-height: 1.7; }

.edit-field { display: block; margin-bottom: 12px; }

.edit-field span { display: block; margin-bottom: 7px; font-size: 12px; font-weight: 800; color: #334155; }

.edit-field small { color: #94a3b8; font-weight: 600; }

.edit-field input { width: 100%; box-sizing: border-box; border: 1px solid #dbe2ea; background: #f8fafc; border-radius: 11px; padding: 12px; font-family: inherit; font-size: 14px; outline: none; }

.edit-field input:focus { background: #fff; border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20,184,166,.10); }

.customer-edit-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 4px; }

.save-customer-btn, .cancel-customer-btn { border-radius: 11px; padding: 12px; font-weight: 800; }

.save-customer-btn { background: #0f766e; color: #fff; }

.cancel-customer-btn { background: #f1f5f9; color: #475569; }

.customer-header {

  display: flex;

  align-items: center;

  gap: 13px;

  margin-bottom: 18px;

}

.customer-header h2 {

  margin: 0 0 5px;

  font-size: 21px;

}

.customer-header p {

  margin: 0;

  color: #7b879b;

  font-size: 13px;

}

.avatar {

  width: 48px;

  height: 48px;

  border-radius: 13px;

  background: #e7f0ff;

  color: #1769e0;

  display: grid;

  place-items: center;

  font-size: 20px;

  font-weight: bold;

}

.balance-card,

.stat-card,

.invoice-card {

  background: white;

  border-radius: 14px;

  padding: 16px;

  margin-bottom: 14px;

  box-shadow: 0 3px 15px #18365b0d;

}

.balance-card {

  display: flex;

  flex-direction: column;

  gap: 10px;

  background: #1769e0;

  color: white;

}

.balance-card span {

  opacity: 0.85;

}

.balance-card strong {

  font-size: 26px;

}

.stats {

  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 12px;

}

.stat-card {

  display: flex;

  flex-direction: column;

  gap: 10px;

}

.stat-card span {

  color: #7b879b;

  font-size: 12px;

}

.stat-card strong {

  font-size: 16px;

}

button {

  border: none;

  cursor: pointer;

  font-family: inherit;

}

.create-btn {

  width: 100%;

  background: #1769e0;

  color: white;

  border-radius: 10px;

  padding: 14px;

  font-weight: bold;

  margin: 5px 0 22px;

}

.invoice-section h3 {

  margin-bottom: 14px;

}

.invoice-card {

  border: 1px solid #edf0f5;

}

.invoice-top {

  display: flex;

  flex-direction: column;

  gap: 6px;

  padding-bottom: 12px;

  margin-bottom: 10px;

  border-bottom: 1px solid #edf0f5;

}

.invoice-top span {

  color: #7b879b;

  font-size: 12px;

}

.invoice-row,

.item-row,

.payment-row {

  display: flex;

  justify-content: space-between;

  gap: 10px;

  padding: 7px 0;

  font-size: 13px;

}

.remaining strong {

  color: #d97706;

}

.invoice-status {

  display: inline-block;

  margin: 8px 0;

  padding: 6px 10px;

  border-radius: 8px;

  background: #fff3d9;

  color: #b7791f;

  font-size: 12px;

  font-weight: bold;

}

.invoice-status.settled {

  background: #e5f7ed;

  color: #16834a;

}

.payments-section {

  margin-top: 14px;

  padding: 12px;

  border-radius: 10px;

  background: #f4f7fc;

}

.payments-section h4 {

  margin: 0 0 10px;

  font-size: 14px;

}

.payment-row {

  border-bottom: 1px solid #e5eaf2;

}

.payment-row:last-child {

  border-bottom: none;

}

.payment-row strong {

  color: #16834a;

}

.no-payments {

  font-size: 12px;

  color: #7b879b;

}

.payment-btn,

.save-btn,

.cancel-btn,

.delete-invoice-btn {

  padding: 11px 14px;

  border-radius: 9px;

  font-weight: bold;

  margin-top: 8px;

}

.payment-btn,

.save-btn {

  background: #1769e0;

  color: white;

}

.delete-invoice-btn {

  display: block;

  background: #fff0ef;

  color: #c0392b;

}

.payment-box {

  margin-top: 12px;

  padding: 14px;

  background: #f4f7fc;

  border-radius: 10px;

}

.payment-box label {

  display: flex;

  flex-direction: column;

  gap: 8px;

  font-size: 13px;

  font-weight: bold;

}

.payment-box input {

  width: 100%;

  box-sizing: border-box;

  padding: 12px;

  border: 1px solid #d7dfeb;

  border-radius: 8px;

  font: inherit;

  background: white;

  color: #172b4d;

}

.payment-actions {

  display: flex;

  gap: 10px;

  margin-top: 8px;

}

.cancel-btn {

  background: #e5eaf2;

  color: #43536b;

}

.invoice-details {

  border-top: 1px solid #edf0f5;

  margin-top: 14px;

  padding-top: 12px;

  font-size: 13px;

}

.invoice-details summary {

  color: #1769e0;

  cursor: pointer;

  font-weight: bold;

}

.item-row {

  color: #58677f;

}

.empty {

  text-align: center;

  color: #7b879b;

  background: white;

  border-radius: 12px;

  padding: 25px 12px;

}

.invoice-actions {

  display: flex;

  flex-wrap: wrap;

  gap: 8px;

  margin-top: 10px;

}

.preview-invoice-btn,

.print-btn,

.close-preview-btn {

  border: 0;

  border-radius: 9px;

  padding: 10px 13px;

  font: inherit;

  font-weight: 700;

  cursor: pointer;

}

.preview-invoice-btn,

.print-btn {

  background: #1769e0;

  color: #fff;

}

.preview-overlay {

  position: fixed;

  inset: 0;

  z-index: 1000;

  display: flex;

  align-items: flex-start;

  justify-content: center;

  padding: 18px;

  overflow-y: auto;

  background: #10182899;

}

.preview-dialog {

  width: min(100%, 760px);

  margin: auto;

  background: #f3f5f8;

  border-radius: 14px;

  overflow: hidden;

  box-shadow: 0 12px 40px #0003;

}

.preview-toolbar {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 12px;

  padding: 12px 16px;

  background: #fff;

  border-bottom: 1px solid #e5eaf2;

}

.preview-toolbar-actions {

  display: flex;

  gap: 8px;

}

.close-preview-btn {

  background: #e9eef5;

  color: #40516b;

}

.printable-invoice {

  margin: 18px;

  padding: 28px;

  background: #fff;

  color: #172b4d;

  border-radius: 8px;

  direction: rtl;

}

.print-shop-header {

  display: flex;

  align-items: center;

  gap: 16px;

  padding-bottom: 18px;

  border-bottom: 2px solid #1769e0;

}

.print-shop-logo {

  width: 76px;

  height: 76px;

  object-fit: contain;

  border-radius: 8px;

}

.print-shop-info h1 {

  margin: 0 0 8px;

  font-size: 22px;

}

.print-shop-info p {

  margin: 4px 0;

  color: #58677f;

  font-size: 13px;

}

.print-invoice-title {

  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 12px;

  margin: 20px 0;

}

.print-invoice-title h2 {

  margin: 0;

  font-size: 20px;

}

.print-customer-info {

  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 10px;

  margin-bottom: 20px;

  padding: 14px;

  background: #f7f9fc;

  border-radius: 8px;

  font-size: 13px;

}

.print-customer-info span {

  color: #6b778c;

  font-weight: 700;

}

.print-items-table {

  width: 100%;

  border-collapse: collapse;

  font-size: 12px;

}

.print-items-table th,

.print-items-table td {

  padding: 10px 7px;

  border: 1px solid #dce3ed;

  text-align: right;

}

.print-items-table th {

  background: #edf3fc;

}

.print-totals {

  width: min(100%, 320px);

  margin: 20px 0 0 auto;

}

.print-totals div {

  display: flex;

  justify-content: space-between;

  gap: 12px;

  padding: 9px 0;

  border-bottom: 1px solid #edf0f5;

}

.print-remaining {

  color: #b7791f;

  font-weight: 800;

}

.print-footer {

  margin-top: 34px;

  padding-top: 14px;

  border-top: 1px dashed #cbd5e1;

  text-align: center;

  color: #58677f;

}

@media print {

  @page {

    size: A4;

    margin: 12mm;

  }

  :global(body) {

    background: #fff !important;

  }

  .details-page > div,

  .no-print {

    display: none !important;

  }

  .preview-overlay {

    position: static !important;

    display: block !important;

    padding: 0 !important;

    overflow: visible !important;

    background: #fff !important;

  }

  .preview-dialog {

    width: 100% !important;

    margin: 0 !important;

    overflow: visible !important;

    background: #fff !important;

    box-shadow: none !important;

  }

  .printable-invoice {

    margin: 0 !important;

    padding: 0 !important;

    border-radius: 0 !important;

    box-shadow: none !important;

  }

  .print-items-table,

  .print-totals,

  .print-customer-info {

    break-inside: avoid;

  }

}

@media (max-width: 520px) {

  .preview-overlay {

    padding: 8px;

  }

  .printable-invoice {

    margin: 8px;

    padding: 16px;

  }

  .print-customer-info {

    grid-template-columns: 1fr;

  }

  .print-invoice-title {

    align-items: flex-start;

    flex-direction: column;

  }

}

.share-pdf-btn {

  background: #16834a;

  color: #fff;

  border: 0;

  border-radius: 9px;

  padding: 10px 13px;

  font: inherit;

  font-weight: 700;

  cursor: pointer;

}

</style>
