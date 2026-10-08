
<script setup>
import { ref, onMounted, watch } from 'vue'

const emit = defineEmits(['open-customer'])

const customers = ref([])
const search = ref('')
const showForm = ref(false)
const customerName = ref('')
const customerPhone = ref('')

onMounted(() => {
  try {
    customers.value = JSON.parse(
      localStorage.getItem('hesabaty_customers') || '[]'
    )
  } catch {
    customers.value = []
  }
})

watch(
  customers,
  (newCustomers) => {
    localStorage.setItem('hesabaty_customers', JSON.stringify(newCustomers))
  },
  { deep: true }
)

const filteredCustomers = () =>
  customers.value.filter(customer =>
    customer.name.toLowerCase().includes(search.value.toLowerCase())
  )

function addCustomer() {
  const name = customerName.value.trim()

  if (!name) {
    alert('اكتب اسم العميل الأول')
    return
  }

  customers.value.push({
    id: Date.now().toString(),
    name,
    phone: customerPhone.value.trim(),
    balance: 0,
    createdAt: new Date().toISOString()
  })

  customerName.value = ''
  customerPhone.value = ''
  showForm.value = false
}
</script>

<template>
  <div class="customers-page" dir="rtl">
    <div class="page-header">
      <div>
        <h2>العملاء</h2>
        <p>إدارة العملاء وحساباتهم</p>
      </div>

      <button class="add-btn" @click="showForm = !showForm">
        {{ showForm ? 'إلغاء' : '+ إضافة عميل' }}
      </button>
    </div>

    <div v-if="showForm" class="customer-form">
      <h3>إضافة عميل جديد</h3>

      <input v-model="customerName" placeholder="اسم العميل" />

      <input
        v-model="customerPhone"
        type="tel"
        placeholder="رقم الهاتف (اختياري)"
      />

      <button class="save-btn" @click="addCustomer">
        حفظ العميل
      </button>
    </div>

    <div class="search-box">
      <input
        v-model="search"
        type="search"
        placeholder="ابحث عن عميل بالاسم..."
      />
    </div>

    <div class="customers-count">
      عدد العملاء: {{ customers.length }}
    </div>

    <div v-if="filteredCustomers().length === 0" class="empty-state">
      <p>مفيش عملاء لعرضهم</p>
      <span>ابدأ بإضافة عميل جديد</span>
    </div>

    <div v-else class="customers-list">
      <div
        v-for="customer in filteredCustomers()"
        :key="customer.id"
        class="customer-card"
      >
        <div class="customer-info">
          <div class="avatar">
            {{ customer.name.charAt(0) }}
          </div>

          <div>
            <h3>{{ customer.name }}</h3>
            <p>{{ customer.phone || 'لا يوجد رقم هاتف' }}</p>
          </div>
        </div>

        <div class="customer-balance">
          <span>المديونية</span>
          <strong>{{ customer.balance }} ج.م</strong>
        </div>

        <button
          class="details-btn"
          @click="emit('open-customer', customer.id)"
        >
          عرض الحساب
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customers-page {
  padding: 18px;
  color: #172b4d;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
}

.page-header h2 {
  margin: 0 0 6px;
  font-size: 23px;
}

.page-header p {
  margin: 0;
  color: #7b879b;
  font-size: 13px;
}

button {
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.add-btn,
.save-btn {
  background: #1769e0;
  color: white;
  padding: 11px 15px;
  border-radius: 10px;
  font-weight: bold;
}

.customer-form {
  background: white;
  padding: 18px;
  border-radius: 14px;
  box-shadow: 0 3px 15px #18365b12;
  margin-bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.customer-form h3 {
  margin: 0 0 5px;
}

input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dce3ed;
  border-radius: 10px;
  padding: 13px;
  outline: none;
  font-family: inherit;
  background: white;
}

input:focus {
  border-color: #1769e0;
}

.search-box {
  margin-bottom: 15px;
}

.customers-count {
  color: #7b879b;
  font-size: 13px;
  margin-bottom: 12px;
}

.empty-state {
  background: white;
  padding: 35px 15px;
  text-align: center;
  border-radius: 14px;
  color: #7b879b;
}

.empty-state p {
  color: #172b4d;
  font-weight: bold;
  margin-bottom: 8px;
}

.customers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.customer-card {
  background: white;
  border-radius: 14px;
  padding: 15px;
  box-shadow: 0 3px 15px #18365b0d;
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 43px;
  height: 43px;
  border-radius: 12px;
  background: #e7f0ff;
  color: #1769e0;
  display: grid;
  place-items: center;
  font-weight: bold;
  font-size: 18px;
}

.customer-info h3 {
  margin: 0 0 5px;
  font-size: 16px;
}

.customer-info p {
  margin: 0;
  color: #7b879b;
  font-size: 13px;
}

.customer-balance {
  display: flex;
  justify-content: space-between;
  margin: 16px 0;
  font-size: 14px;
}

.customer-balance span {
  color: #7b879b;
}

.customer-balance strong {
  color: #1769e0;
}

.details-btn {
  width: 100%;
  padding: 11px;
  border-radius: 9px;
  background: #f0f5fc;
  color: #1769e0;
  font-weight: bold;
}
</style>
