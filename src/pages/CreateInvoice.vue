
<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['save', 'cancel'])

const invoiceDate = new Date()
const dateText = ref(
  invoiceDate.toLocaleDateString('en-CA')
)
const timeText = ref(
  invoiceDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  })
)

const items = ref([
  { id: 1, name: '', wholesale: '', price: '', quantity: 1 }
])

const paid = ref(0)

const total = computed(() =>
  items.value.reduce((sum, item) => {
    return sum + (Number(item.price) || 0) * (Number(item.quantity) || 0)
  }, 0)
)

const remaining = computed(() =>
  Math.max(0, total.value - (Number(paid.value) || 0))
)

function addItem() {
  items.value.push({
    id: Date.now() + Math.random(),
    name: '',
    wholesale: '',
    price: '',
    quantity: 1
  })
}

function removeItem(id) {
  if (items.value.length === 1) return
  items.value = items.value.filter(item => item.id !== id)
}

function saveInvoice() {
  const validItems = items.value.every(item =>
    item.name.trim() &&
    Number(item.price) > 0 &&
    Number(item.quantity) > 0 &&
    Number(item.wholesale) >= 0 &&
    item.wholesale !== ''
  )

  if (!validItems) {
    alert('راجع بيانات الأصناف، واكتب الاسم والأسعار والكمية بشكل صحيح')
    return
  }

  const paidAmount = Number(paid.value)

  if (!Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > total.value) {
    alert('المبلغ المدفوع لازم يكون بين صفر وإجمالي الفاتورة')
    return
  }

  const invoice = {
  id: crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(),
  number: `INV-${Date.now()}`,
  date: dateText.value,
  time: timeText.value,
  items: items.value.map(item => ({
    name: item.name.trim(),
    wholesale: Number(item.wholesale),
    price: Number(item.price),
    quantity: Number(item.quantity),
    lineTotal: Number(item.price) * Number(item.quantity)
  })),
  total: total.value,
  paid: paidAmount,
  remaining: remaining.value,
  payments: paidAmount > 0 ? [{ amount: paidAmount }] : []
}

emit('save', invoice)
}
</script>

<template>
  <div class="invoice-page" dir="rtl">
    <div class="page-heading">
      <h2>إنشاء فاتورة جديدة</h2>
      <p>أدخل بيانات الفاتورة والأصناف</p>
    </div>

    <section class="section-card">
      <h3>بيانات الفاتورة</h3>

      <div class="date-grid">
        <label>
          التاريخ
          <input v-model="dateText" type="date" />
        </label>

        <label>
          الوقت
          <input v-model="timeText" type="time" />
        </label>
      </div>

      <p class="auto-note">
        التاريخ والوقت اتسجلوا تلقائيًا، وتقدر تعدلهم لو محتاج.
      </p>
    </section>

    <section class="section-card">
      <div class="section-title">
        <h3>أصناف الفاتورة</h3>
        <button class="add-item-btn" @click="addItem">
          + إضافة صنف
        </button>
      </div>

      <div
        v-for="(item, index) in items"
        :key="item.id"
        class="item-card"
      >
        <div class="item-heading">
          <strong>الصنف {{ index + 1 }}</strong>
          <button
            v-if="items.length > 1"
            class="remove-btn"
            @click="removeItem(item.id)"
          >
            حذف
          </button>
        </div>

        <label>
          اسم المنتج
          <input
            v-model="item.name"
            type="text"
            placeholder="اكتب اسم المنتج"
          />
        </label>

        <div class="field-grid">
          <label>
            سعر الجملة
            <input
              v-model="item.wholesale"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
            />
          </label>

          <label>
            سعر البيع
            <input
              v-model="item.price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0"
            />
          </label>
        </div>

        <label>
          الكمية
          <input
            v-model.number="item.quantity"
            type="number"
            min="1"
            step="1"
          />
        </label>

        <div class="line-total">
          <span>إجمالي الصنف</span>
          <strong>
            {{ ((Number(item.price) || 0) * (Number(item.quantity) || 0)).toLocaleString('ar-EG') }}
            ج.م
          </strong>
        </div>
      </div>
    </section>

    <section class="section-card summary">
      <h3>ملخص الفاتورة</h3>

      <div class="summary-row total-row">
        <span>إجمالي الفاتورة</span>
        <strong>{{ total.toLocaleString('ar-EG') }} ج.م</strong>
      </div>

      <label class="paid-input">
        المبلغ المدفوع
        <input
          v-model.number="paid"
          type="number"
          min="0"
          :max="total"
          step="0.01"
          placeholder="اكتب المبلغ المدفوع"
        />
      </label>

      <div class="summary-row remaining-row">
        <span>المديونية المتبقية</span>
        <strong>{{ remaining.toLocaleString('ar-EG') }} ج.م</strong>
      </div>
    </section>

    <div class="actions">
      <button class="save-btn" @click="saveInvoice">
        حفظ الفاتورة
      </button>

      <button class="cancel-btn" @click="emit('cancel')">
        إلغاء
      </button>
    </div>
  </div>
</template>

<style scoped>
.invoice-page {
  padding: 18px;
  color: #172b4d;
}

.page-heading {
  margin-bottom: 20px;
}

.page-heading h2 {
  margin: 0 0 6px;
  font-size: 22px;
}

.page-heading p,
.auto-note {
  color: #7b879b;
  font-size: 13px;
}

.section-card {
  background: white;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 3px 15px #18365b0d;
}

.section-card h3 {
  margin: 0 0 16px;
  font-size: 17px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 13px;
}

input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dce3ed;
  border-radius: 9px;
  padding: 12px;
  font-family: inherit;
  outline: none;
  background: white;
  color: #172b4d;
}

input:focus {
  border-color: #1769e0;
}

.date-grid,
.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.auto-note {
  margin: 0;
}

.section-title,
.item-heading,
.line-total,
.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.add-item-btn {
  background: #e7f0ff;
  color: #1769e0;
  padding: 9px 12px;
  border-radius: 9px;
  font-family: inherit;
  font-weight: bold;
}

.item-card {
  border: 1px solid #e8edf5;
  border-radius: 12px;
  padding: 13px;
  margin-bottom: 13px;
}

.item-heading {
  margin-bottom: 14px;
}

.remove-btn {
  color: #c0392b;
  background: #fff0ef;
  padding: 6px 10px;
  border-radius: 8px;
  font-family: inherit;
}

.line-total {
  border-top: 1px solid #edf0f5;
  padding-top: 12px;
  font-size: 14px;
}

.line-total strong,
.total-row strong {
  color: #1769e0;
}

.paid-input {
  margin: 18px 0;
}

.remaining-row {
  border-top: 1px solid #edf0f5;
  padding-top: 15px;
  color: #172b4d;
}

.remaining-row strong {
  color: #d97706;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.save-btn,
.cancel-btn {
  border: none;
  padding: 14px;
  border-radius: 10px;
  font-family: inherit;
  font-weight: bold;
  cursor: pointer;
}

.save-btn {
  background: #1769e0;
  color: white;
}

.cancel-btn {
  background: #e9eef5;
  color: #40516b;
}

@media (max-width: 380px) {
  .date-grid,
  .field-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
