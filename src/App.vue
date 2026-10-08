<script setup>

import { ref, computed, onMounted, onUnmounted } from 'vue'

import { App } from '@capacitor/app'

import { StatusBar, Style } from '@capacitor/status-bar'



import Customers from './pages/Customers.vue'

import CustomerDetails from './pages/CustomerDetails.vue'

import CreateInvoice from './pages/CreateInvoice.vue'



const activePage = ref('الرئيسية')

const navigationHistory = ref([

  {

    page: 'الرئيسية',

    customerId: null

  }

])



let isGoingBack = false

let backButtonHandle = null

const selectedCustomerId = ref(null)

const refreshKey = ref(0)

const backupInput = ref(null)



const storeProfile = ref({

  name: '',

  phone: '',

  address: '',

  logo: ''

})



const logoInput = ref(null)



/* =========================

   STATUS BAR

========================= */



async function setupSystemBars() {
  try {
    // في إصدارات Android التي ما زالت تدعم الـ API القديم:
    // نخلي الـ Status Bar خارج مساحة الـ WebView.
    try {
      await StatusBar.setOverlaysWebView({
        overlay: false
      })
    } catch {
      // Android 15+ قد يتجاهل هذا بسبب Edge-to-Edge.
    }

    await StatusBar.show()

    try {
      await StatusBar.setStyle({
        style: Style.Light
      })
    } catch {
      // تجاهل الخطأ لو الإصدار لا يدعم تغيير الـ style.
    }

    try {
      await StatusBar.setBackgroundColor({
        color: '#FFFFFFFF'
      })
    } catch {
      // Android 15+ قد يتجاهل تغيير لون الـ Status Bar.
    }

    const info = await StatusBar.getInfo()

    const statusBarHeight =
      Number(info?.height || 0) > 0
        ? Number(info.height)
        : 24

    document.documentElement.style.setProperty(
      '--status-bar-height',
      `${statusBarHeight}px`
    )
  } catch (error) {
    console.warn('Status Bar setup error:', error)
  }
}

/* =========================
   ANDROID BACK BUTTON
========================= */

function pushNavigation(page, customerId = null) {
  const current =
    navigationHistory.value[
      navigationHistory.value.length - 1
    ]

  if (
    current &&
    current.page === page &&
    String(current.customerId ?? '') ===
      String(customerId ?? '')
  ) {
    activePage.value = page
    selectedCustomerId.value = customerId
    refreshData()
    return
  }

  navigationHistory.value.push({
    page,
    customerId
  })

  activePage.value = page
  selectedCustomerId.value = customerId
  refreshData()
}

function goBack() {
  if (isGoingBack) return

  isGoingBack = true

  try {
    if (navigationHistory.value.length > 1) {
      navigationHistory.value.pop()

      const previous =
        navigationHistory.value[
          navigationHistory.value.length - 1
        ]

      activePage.value = previous.page
      selectedCustomerId.value =
        previous.customerId ?? null

      refreshData()
    } else {
      App.exitApp()
    }
  } catch (error) {
    console.warn('Back navigation error:', error)
  } finally {
    setTimeout(() => {
      isGoingBack = false
    }, 150)
  }
}

async function setupAndroidBackButton() {
  try {
    backButtonHandle = await App.addListener(
      'backButton',
      () => {
        goBack()
      }
    )
  } catch (error) {
    console.warn('Back button setup error:', error)
  }
}



/* =========================

   STORE PROFILE

========================= */



function loadStoreProfile() {

  try {

    const saved = JSON.parse(

      localStorage.getItem('hesabaty_store_profile') || '{}'

    )



    storeProfile.value = {

      name: saved.name || '',

      phone: saved.phone || '',

      address: saved.address || '',

      logo: saved.logo || ''

    }

  } catch {

    storeProfile.value = {

      name: '',

      phone: '',

      address: '',

      logo: ''

    }

  }

}



function saveStoreProfile() {

  try {

    localStorage.setItem(

      'hesabaty_store_profile',

      JSON.stringify(storeProfile.value)

    )



    alert('تم حفظ بيانات المحل بنجاح.')

  } catch {

    alert('تعذر الحفظ. جرّب صورة أصغر أو مساحة تخزين أقل.')

  }

}



function chooseLogo() {

  logoInput.value?.click()

}



function handleLogoChange(event) {

  const file = event.target.files?.[0]



  if (!file) return



  if (!file.type.startsWith('image/')) {

    alert('اختار صورة صالحة.')

    event.target.value = ''

    return

  }



  if (file.size > 500 * 1024) {

    alert('حجم الصورة كبير. اختار صورة أقل من 500 كيلوبايت.')

    event.target.value = ''

    return

  }



  const reader = new FileReader()



  reader.onload = () => {

    storeProfile.value.logo = reader.result

  }



  reader.onerror = () => {

    alert('تعذر قراءة الصورة.')

  }



  reader.readAsDataURL(file)



  event.target.value = ''

}



function removeLogo() {

  storeProfile.value.logo = ''

}



/* =========================

   CUSTOMERS

========================= */



const customers = computed(() => {

  refreshKey.value



  try {

    return JSON.parse(

      localStorage.getItem('hesabaty_customers') || '[]'

    )

  } catch {

    return []

  }

})



/* =========================

   ALL INVOICES

========================= */



const allInvoices = computed(() => {

  refreshKey.value



  const result = []



  for (const customer of customers.value) {

    try {

      const invoices = JSON.parse(

        localStorage.getItem(

          `hesabaty_invoices_${customer.id}`

        ) || '[]'

      )



      for (const invoice of invoices) {

        result.push({

          ...invoice,

          customerId: customer.id,

          customerName: customer.name

        })

      }

    } catch {

      // تجاهل الفواتير غير القابلة للقراءة

    }

  }



  return result.sort((a, b) => {

    const dateA = new Date(

      `${a.date || ''}T${a.time || '00:00'}`

    )



    const dateB = new Date(

      `${b.date || ''}T${b.time || '00:00'}`

    )



    return dateB - dateA

  })

})



/* =========================

   STATISTICS

========================= */



const totalDebt = computed(() =>

  allInvoices.value.reduce(

    (sum, invoice) =>

      sum + Number(invoice.remaining || 0),

    0

  )

)



const totalInvoiceAmount = computed(() =>

  allInvoices.value.reduce(

    (sum, invoice) =>

      sum + Number(invoice.total || 0),

    0

  )

)



const totalPaid = computed(() =>

  allInvoices.value.reduce(

    (sum, invoice) =>

      sum + Number(invoice.paid || 0),

    0

  )

)



const unpaidInvoices = computed(() =>

  allInvoices.value.filter(

    invoice => Number(invoice.remaining || 0) > 0

  )

)



/* =========================

   NAVIGATION

========================= */



function refreshData() {

  refreshKey.value++

}



function openHome() {
  pushNavigation('الرئيسية')
}

function openCustomers() {
  pushNavigation('العملاء')
}

function openInvoices() {
  pushNavigation('الفواتير')
}

function openMore() {
  pushNavigation('المزيد')
}

function openCustomer(id) {
  pushNavigation('تفاصيل العميل', id)
}

function createInvoice(id) {
  pushNavigation('إنشاء فاتورة', id)
}

function cancelInvoice() {
  goBack()
}



/* =========================

   SAVE INVOICE

========================= */



function saveInvoice(invoice) {

  if (!selectedCustomerId.value) return



  const key =

    `hesabaty_invoices_${selectedCustomerId.value}`



  let invoices = []

  let customersList = []



  try {

    invoices = JSON.parse(

      localStorage.getItem(key) || '[]'

    )



    customersList = JSON.parse(

      localStorage.getItem(

        'hesabaty_customers'

      ) || '[]'

    )

  } catch {

    alert(

      'حصل خطأ في قراءة البيانات. الفاتورة لم تُحفظ.'

    )

    return

  }



  const customer = customersList.find(

    item =>

      String(item.id) ===

      String(selectedCustomerId.value)

  )



  if (!customer) {

    alert(

      'العميل غير موجود. الفاتورة لم تُحفظ.'

    )

    return

  }



  const updatedInvoices = [

    invoice,

    ...invoices

  ]



  const updatedBalance =

    Number(customer.balance || 0) +

    Number(invoice.remaining || 0)



  const updatedCustomers =

    customersList.map(item =>

      String(item.id) ===

      String(selectedCustomerId.value)

        ? {

            ...item,

            balance: updatedBalance

          }

        : item

    )



  try {

    localStorage.setItem(

      key,

      JSON.stringify(updatedInvoices)

    )



    localStorage.setItem(

      'hesabaty_customers',

      JSON.stringify(updatedCustomers)

    )



    goBack()

  } catch {

    alert(

      'تعذر حفظ الفاتورة. تأكد من مساحة التخزين.'

    )

  }

}



/* =========================

   INVOICE NAVIGATION

========================= */



function openInvoiceCustomer(invoice) {

  openCustomer(invoice.customerId)

}



/* =========================

   FORMATTERS

========================= */



function formatMoney(value) {

  return (

    Number(value || 0).toLocaleString('ar-EG') +

    ' ج.م'

  )

}



function formatDate(date) {

  if (!date) return ''



  return new Date(

    `${date}T00:00:00`

  ).toLocaleDateString('ar-EG')

}



/* =========================

   BACKUP

========================= */



function exportBackup() {

  const backup = {

    app: 'حساباتي',

    version: 1,

    createdAt: new Date().toISOString(),

    customers: customers.value,

    invoices: {}

  }



  for (const customer of customers.value) {

    const key =

      `hesabaty_invoices_${customer.id}`



    try {

      backup.invoices[key] = JSON.parse(

        localStorage.getItem(key) || '[]'

      )

    } catch {

      backup.invoices[key] = []

    }

  }



  const blob = new Blob(

    [JSON.stringify(backup, null, 2)],

    {

      type: 'application/json;charset=utf-8'

    }

  )



  const url = URL.createObjectURL(blob)



  const link = document.createElement('a')



  link.href = url



  link.download =

    `hesabaty-backup-${new Date()

      .toISOString()

      .slice(0, 10)}.json`



  document.body.appendChild(link)



  link.click()



  link.remove()



  URL.revokeObjectURL(url)

}



function chooseBackup() {

  backupInput.value?.click()

}



function importBackup(event) {

  const file = event.target.files?.[0]



  if (!file) return



  const reader = new FileReader()



  reader.onload = () => {

    try {

      const backup = JSON.parse(

        reader.result

      )



      if (

        !backup ||

        !Array.isArray(backup.customers) ||

        !backup.invoices ||

        typeof backup.invoices !== 'object'

      ) {

        alert(

          'ملف النسخة الاحتياطية غير صحيح.'

        )

        return

      }



      const confirmed = confirm(

        'استعادة النسخة الاحتياطية ستستبدل بيانات العملاء والفواتير الحالية. هل تريد المتابعة؟'

      )



      if (!confirmed) return



      for (const customer of backup.customers) {

        if (

          customer.id === undefined ||

          customer.id === null

        ) {

          throw new Error(

            'بيانات عميل غير صحيحة'

          )

        }



        const key =

          `hesabaty_invoices_${customer.id}`



        if (

          backup.invoices[key] !== undefined &&

          !Array.isArray(

            backup.invoices[key]

          )

        ) {

          throw new Error(

            'بيانات فواتير غير صحيحة'

          )

        }

      }



      const oldCustomers =

        localStorage.getItem(

          'hesabaty_customers'

        )



      const oldInvoiceKeys = []



      for (

        let i = 0;

        i < localStorage.length;

        i++

      ) {

        const key = localStorage.key(i)



        if (

          key?.startsWith(

            'hesabaty_invoices_'

          )

        ) {

          oldInvoiceKeys.push([

            key,

            localStorage.getItem(key)

          ])

        }

      }



      try {

        for (const [key] of oldInvoiceKeys) {

          localStorage.removeItem(key)

        }



        localStorage.setItem(

          'hesabaty_customers',

          JSON.stringify(

            backup.customers

          )

        )



        for (

          const [key, invoices]

          of Object.entries(

            backup.invoices

          )

        ) {

          if (

            key.startsWith(

              'hesabaty_invoices_'

            )

          ) {

            localStorage.setItem(

              key,

              JSON.stringify(invoices)

            )

          }

        }

      } catch (error) {

        if (oldCustomers !== null) {

          localStorage.setItem(

            'hesabaty_customers',

            oldCustomers

          )

        } else {

          localStorage.removeItem(

            'hesabaty_customers'

          )

        }



        for (const [key] of oldInvoiceKeys) {

          localStorage.removeItem(key)

        }



        for (

          const [key, value]

          of oldInvoiceKeys

        ) {

          if (value !== null) {

            localStorage.setItem(

              key,

              value

            )

          }

        }



        throw error

      }



      refreshData()



      activePage.value = 'الرئيسية'



      alert(

        'تمت استعادة النسخة الاحتياطية بنجاح.'

      )

    } catch {

      alert(

        'تعذر استعادة النسخة. تأكد من صحة الملف ومساحة التخزين.'

      )

    } finally {

      event.target.value = ''

    }

  }



  reader.onerror = () => {

    alert('تعذر قراءة الملف.')

    event.target.value = ''

  }



  reader.readAsText(file)

}



/* =========================

   START APP

========================= */



loadStoreProfile()

onMounted(() => {
  setupSystemBars()
  setupAndroidBackButton()
})

onUnmounted(() => {
  if (backButtonHandle) {
    backButtonHandle.remove()
    backButtonHandle = null
  }
})

</script>



<template>

  <div

    class="app-container"

    dir="rtl"

  >

    <!-- HEADER -->



    <header class="app-header">

      <h1>حساباتي</h1>



      <span>

        دفتر حساباتك الإلكتروني

      </span>

    </header>



    <!-- CONTENT -->



    <main class="app-content">



      <!-- =========================

           HOME

      ========================== -->



      <section

        v-if="activePage === 'الرئيسية'"

        class="home-page"

      >



        <div class="home-store-card">



          <img

            v-if="storeProfile.logo"

            :src="storeProfile.logo"

            alt="لوجو المحل"

            class="home-store-logo"

          />



          <div

            v-else

            class="home-store-logo-placeholder"

          >

            🏪

          </div>



          <div class="home-store-details">



            <h2>

              {{

                storeProfile.name ||

                'اسم المحل غير محدد'

              }}

            </h2>



            <p

              v-if="storeProfile.phone"

            >

              {{ storeProfile.phone }}

            </p>



            <p

              v-if="storeProfile.address"

            >

              {{ storeProfile.address }}

            </p>



            <p

              v-if="

                !storeProfile.phone &&

                !storeProfile.address

              "

              class="store-profile-hint"

            >

              أضف بيانات المحل من صفحة المزيد

            </p>



          </div>

        </div>



        <h2>الرئيسية</h2>



        <p class="welcome">

          أهلاً بيك في حساباتي

        </p>



        <div

          class="home-card debt-card"

        >

          <span>

            إجمالي المديونيات

          </span>



          <strong>

            {{ formatMoney(totalDebt) }}

          </strong>

        </div>



        <div class="summary-grid">



          <div class="summary-card">

            <span>العملاء</span>



            <strong>

              {{ customers.length }}

            </strong>

          </div>



          <div class="summary-card">

            <span>الفواتير</span>



            <strong>

              {{ allInvoices.length }}

            </strong>

          </div>



          <div class="summary-card">

            <span>إجمالي الفواتير</span>



            <strong>

              {{ formatMoney(totalInvoiceAmount) }}

            </strong>

          </div>



          <div class="summary-card">

            <span>إجمالي المدفوع</span>



            <strong>

              {{ formatMoney(totalPaid) }}

            </strong>

          </div>



        </div>



        <button

          class="primary-btn"

          @click="openCustomers"

        >

          عرض العملاء

        </button>



        <button

          class="secondary-btn"

          @click="

            activePage = 'الفواتير'

          "

        >

          عرض الفواتير

        </button>



      </section>



      <!-- =========================

           CUSTOMERS

      ========================== -->



      <Customers

        v-else-if="

          activePage === 'العملاء'

        "

        @open-customer="openCustomer"

      />



      <!-- =========================

           CUSTOMER DETAILS

      ========================== -->



      <section

        v-else-if="

          activePage === 'تفاصيل العميل'

        "

      >



        <button

          class="back-btn"

          @click="openCustomers"

        >

          ← الرجوع للعملاء

        </button>



        <CustomerDetails

          v-if="

            selectedCustomerId !== null

          "

          :key="selectedCustomerId"

          :customer-id="

            selectedCustomerId

          "

          @create-invoice="

            createInvoice

          "

        />



      </section>



      <!-- =========================

           CREATE INVOICE

      ========================== -->



      <section

        v-else-if="

          activePage === 'إنشاء فاتورة'

        "

      >



        <CreateInvoice

          :key="selectedCustomerId"

          :customer-id="

            selectedCustomerId

          "

          @save="saveInvoice"

          @cancel="cancelInvoice"

        />



      </section>



      <!-- =========================

           INVOICES

      ========================== -->



      <section

        v-else-if="

          activePage === 'الفواتير'

        "

        class="invoices-page"

      >



        <h2>كل الفواتير</h2>



        <div class="invoice-summary">



          <div>

            <span>عدد الفواتير</span>



            <strong>

              {{ allInvoices.length }}

            </strong>

          </div>



          <div>

            <span>فواتير غير مسددة</span>



            <strong>

              {{ unpaidInvoices.length }}

            </strong>

          </div>



        </div>



        <div

          v-if="allInvoices.length === 0"

          class="empty-state"

        >

          مفيش فواتير لحد دلوقتي

        </div>



        <article

          v-for="invoice in allInvoices"

          :key="

            `${invoice.customerId}-${invoice.id}`

          "

          class="list-invoice-card"

        >



          <div class="invoice-heading">



            <div>

              <strong>

                {{

                  invoice.number ||

                  'فاتورة'

                }}

              </strong>



              <p>

                {{ invoice.customerName }}

              </p>

            </div>



            <span

              class="invoice-badge"

              :class="{

                settled:

                  Number(

                    invoice.remaining || 0

                  ) === 0

              }"

            >

              {{

                Number(

                  invoice.remaining || 0

                ) === 0

                  ? 'مدفوعة'

                  : 'غير مسددة'

              }}

            </span>



          </div>



          <div class="invoice-info">

            <span>التاريخ</span>



            <strong>

              {{ formatDate(invoice.date) }}

            </strong>

          </div>



          <div class="invoice-info">

            <span>الإجمالي</span>



            <strong>

              {{ formatMoney(invoice.total) }}

            </strong>

          </div>



          <div class="invoice-info">

            <span>المدفوع</span>



            <strong>

              {{ formatMoney(invoice.paid) }}

            </strong>

          </div>



          <div

            class="

              invoice-info

              remaining-info

            "

          >

            <span>المتبقي</span>



            <strong>

              {{

                formatMoney(

                  invoice.remaining

                )

              }}

            </strong>

          </div>



          <button

            class="open-customer-btn"

            @click="

              openInvoiceCustomer(invoice)

            "

          >

            فتح حساب العميل

          </button>



        </article>



      </section>



      <!-- =========================

           MORE

      ========================== -->



      <section

        v-else-if="

          activePage === 'المزيد'

        "

        class="more-page"

      >



        <h2>المزيد</h2>



        <p class="more-description">

          احفظ نسخة من بياناتك أو استعد نسخة سابقة.

        </p>



        <!-- STORE SETTINGS -->



        <div

          class="

            more-card

            store-settings

          "

        >



          <div>

            <h3>بيانات المحل</h3>



            <p>

              خصص بيانات المحل التي ستظهر على الفواتير.

            </p>

          </div>



          <div

            class="store-logo-section"

          >



            <img

              v-if="storeProfile.logo"

              :src="storeProfile.logo"

              alt="لوجو المحل"

              class="store-logo-preview"

            />



            <div

              v-else

              class="store-logo-placeholder"

            >

              اللوجو

            </div>



            <div

              class="logo-actions"

            >



              <button

                class="secondary-btn"

                @click="chooseLogo"

              >

                اختيار اللوجو

              </button>



              <button

                v-if="storeProfile.logo"

                class="remove-logo-btn"

                @click="removeLogo"

              >

                حذف الصورة

              </button>



              <input

                ref="logoInput"

                type="file"

                accept="image/*"

                class="hidden-input"

                @change="

                  handleLogoChange

                "

              />



            </div>

          </div>



          <label

            class="store-label"

          >

            اسم المحل



            <input

              v-model.trim="

                storeProfile.name

              "

              type="text"

              placeholder="مثال: محل البركة"

            />

          </label>



          <label

            class="store-label"

          >

            رقم التليفون



            <input

              v-model.trim="

                storeProfile.phone

              "

              type="tel"

              placeholder="01xxxxxxxxx"

            />

          </label>



          <label

            class="store-label"

          >

            عنوان المحل



            <textarea

              v-model.trim="

                storeProfile.address

              "

              rows="3"

              placeholder="اكتب عنوان المحل"

            ></textarea>

          </label>



          <button

            class="primary-btn"

            @click="saveStoreProfile"

          >

            حفظ بيانات المحل

          </button>



        </div>



        <!-- BACKUP -->



        <div class="more-card">



          <div>

            <h3>النسخ الاحتياطي</h3>



            <p>

              تنزيل ملف يحتوي على العملاء والفواتير.

            </p>

          </div>



          <button

            class="primary-btn"

            @click="exportBackup"

          >

            تنزيل نسخة احتياطية

          </button>



        </div>



        <!-- RESTORE -->



        <div class="more-card">



          <div>

            <h3>استعادة البيانات</h3>



            <p>

              استعادة بياناتك من ملف نسخة احتياطية سابق.

            </p>

          </div>



          <button

            class="secondary-btn"

            @click="chooseBackup"

          >

            اختيار ملف للاستعادة

          </button>



          <input

            ref="backupInput"

            type="file"

            accept=".json,application/json"

            class="hidden-input"

            @change="importBackup"

          />



        </div>



        <p class="warning-note">

          مهم: احتفظ بنسخة احتياطية في مكان آمن.

          الاستعادة تستبدل البيانات الحالية.

        </p>



      </section>



    </main>



    <!-- =========================

         BOTTOM NAV

    ========================== -->



    <nav class="bottom-nav">



      <button

        :class="{

          active:

            activePage === 'الرئيسية'

        }"

        @click="openHome"

      >

        <span>⌂</span>

        الرئيسية

      </button>



      <button

        :class="{

          active:

            [

              'العملاء',

              'تفاصيل العميل',

              'إنشاء فاتورة'

            ].includes(activePage)

        }"

        @click="openCustomers"

      >

        <span>♙</span>

        العملاء

      </button>



      <button

        :class="{

          active:

            activePage === 'الفواتير'

        }"

        @click="openInvoices"

      >

        <span>▤</span>

        الفواتير

      </button>



      <button

        :class="{

          active:

            activePage === 'المزيد'

        }"

        @click="openMore"

      >

        <span>☰</span>

        المزيد

      </button>



    </nav>



  </div>

</template>



<style scoped>



* {

  box-sizing: border-box;

}



:global(html),
:global(body),
:global(#app) {
  margin: 0;
  min-height: 100%;
  width: 100%;
}

.app-container {
  min-height: 100vh;
  background: #f4f7fc;
  color: #172b4d;

  /*
    محتوى التطبيق يبدأ بعد Status Bar.
    على Android 15+ نعتمد على safe-area،
    وعلى الإصدارات الأخرى نستخدم ارتفاع الـ Status Bar.
  */
  padding-top: max(
    var(--status-bar-height, 0px),
    env(safe-area-inset-top, 0px)
  );

  padding-bottom: calc(
    85px +
    env(safe-area-inset-bottom, 0px)
  );
}



/* =========================

   HEADER

========================= */



.app-header {

  background: white;



  padding: 18px;



  box-shadow:

    0 2px 10px #18365b0d;

}



.app-header h1 {

  margin: 0 0 5px;



  color: #1769e0;



  font-size: 23px;

}



.app-header span {

  color: #7b879b;



  font-size: 13px;

}



/* =========================

   CONTENT

========================= */



.app-content {

  max-width: 650px;



  margin: auto;

}



.home-page,

.invoices-page,

.more-page {

  padding: 20px;

}



.home-page h2,

.invoices-page h2,

.more-page h2 {

  margin: 0 0 8px;

}



.welcome,

.more-description {

  color: #7b879b;



  margin: 0 0 18px;

}



/* =========================

   CARDS

========================= */



.home-card,

.summary-card,

.list-invoice-card,

.more-card {

  background: white;



  border-radius: 15px;



  padding: 16px;



  margin: 14px 0;



  box-shadow:

    0 3px 15px #18365b0d;

}



/* =========================

   DEBT CARD

========================= */



.debt-card {

  display: flex;



  flex-direction: column;



  gap: 12px;



  background: #1769e0;



  color: white;



  padding: 22px;

}



.debt-card span {

  opacity: 0.9;

}



.debt-card strong {

  font-size: 25px;

}



/* =========================

   SUMMARY

========================= */



.summary-grid {

  display: grid;



  grid-template-columns: 1fr 1fr;



  gap: 10px;



  margin-bottom: 18px;

}



.summary-card {

  display: flex;



  flex-direction: column;



  gap: 10px;



  margin: 0;

}



.summary-card span,

.invoice-summary span {

  color: #7b879b;



  font-size: 12px;

}



.summary-card strong {

  font-size: 17px;



  overflow-wrap: anywhere;

}



/* =========================

   BUTTONS

========================= */



.primary-btn,

.secondary-btn,

.back-btn,

.open-customer-btn {

  border: none;



  border-radius: 10px;



  padding: 13px 16px;



  font-family: inherit;



  font-weight: bold;



  cursor: pointer;

}



.primary-btn {

  background: #1769e0;



  color: white;



  width: 100%;

}



.secondary-btn {

  background: #e7f0ff;



  color: #1769e0;



  width: 100%;



  margin-top: 10px;

}



.back-btn {

  background: #e7f0ff;



  color: #1769e0;



  margin: 15px 18px 0;

}



/* =========================

   INVOICES SUMMARY

========================= */



.invoice-summary {

  display: grid;



  grid-template-columns: 1fr 1fr;



  gap: 10px;



  margin: 18px 0;

}



.invoice-summary > div {

  display: flex;



  flex-direction: column;



  gap: 8px;



  background: white;



  border-radius: 12px;



  padding: 14px;

}



.invoice-summary strong {

  font-size: 20px;

}



/* =========================

   EMPTY

========================= */



.empty-state {

  background: white;



  border-radius: 12px;



  padding: 25px;



  text-align: center;



  color: #7b879b;

}



/* =========================

   INVOICE CARD

========================= */



.list-invoice-card {

  border: 1px solid #edf0f5;

}



.invoice-heading {

  display: flex;



  justify-content: space-between;



  align-items: flex-start;



  gap: 10px;



  margin-bottom: 12px;

}



.invoice-heading p {

  margin: 5px 0 0;



  color: #7b879b;



  font-size: 13px;

}



.invoice-badge {

  background: #fff3d9;



  color: #b7791f;



  padding: 6px 9px;



  border-radius: 8px;



  font-size: 11px;



  font-weight: bold;



  white-space: nowrap;

}



.invoice-badge.settled {

  background: #e5f7ed;



  color: #16834a;

}



.invoice-info {

  display: flex;



  justify-content: space-between;



  gap: 10px;



  padding: 7px 0;



  font-size: 13px;

}



.invoice-info span {

  color: #7b879b;

}



.remaining-info strong {

  color: #d97706;

}



.open-customer-btn {

  width: 100%;



  margin-top: 12px;



  background: #e7f0ff;



  color: #1769e0;

}



/* =========================

   MORE

========================= */



.more-card h3 {

  margin: 0 0 7px;



  font-size: 16px;

}



.more-card p {

  color: #7b879b;



  font-size: 13px;



  line-height: 1.7;



  margin: 0 0 14px;

}



.hidden-input {

  display: none;

}



.warning-note {

  color: #9a6700;



  background: #fff6df;



  padding: 12px;



  border-radius: 10px;



  font-size: 12px;



  line-height: 1.7;

}



/* =========================

   BOTTOM NAV

========================= */



.bottom-nav {

  position: fixed;



  bottom: 0;



  right: 0;



  left: 0;



  background: white;



  display: flex;



  justify-content: space-around;



  padding:

    10px 5px

    calc(

      10px +

      env(safe-area-inset-bottom, 0px)

    );



  box-shadow:

    0 -2px 12px #18365b12;



  z-index: 100;

}



.bottom-nav button {

  border: none;



  background: transparent;



  color: #8290a5;



  display: flex;



  flex-direction: column;



  align-items: center;



  gap: 5px;



  font-family: inherit;



  font-size: 12px;



  cursor: pointer;

}



.bottom-nav button span {

  font-size: 21px;

}



.bottom-nav button.active {

  color: #1769e0;



  font-weight: bold;

}



/* =========================

   STORE SETTINGS

========================= */



.store-settings {

  display: flex;



  flex-direction: column;



  gap: 16px;

}



.store-logo-section {

  display: flex;



  align-items: center;



  gap: 15px;



  flex-wrap: wrap;

}



.store-logo-preview,

.store-logo-placeholder {

  width: 90px;



  height: 90px;



  border-radius: 12px;



  object-fit: contain;



  border: 1px solid #e5eaf2;



  background: #f8fafc;

}



.store-logo-placeholder {

  display: flex;



  justify-content: center;



  align-items: center;



  color: #7b879b;



  font-size: 13px;

}



.logo-actions {

  display: flex;



  flex-direction: column;



  gap: 8px;



  flex: 1;



  min-width: 130px;

}



.logo-actions .secondary-btn {

  margin: 0;

}



.remove-logo-btn {

  border: none;



  background: #fff0f0;



  color: #c53030;



  border-radius: 10px;



  padding: 10px;



  font-family: inherit;



  font-weight: bold;



  cursor: pointer;

}



.store-label {

  display: flex;



  flex-direction: column;



  gap: 8px;



  font-size: 14px;



  font-weight: bold;



  color: #334155;

}



.store-label input,

.store-label textarea {

  width: 100%;



  box-sizing: border-box;



  border: 1px solid #dbe3ef;



  border-radius: 10px;



  padding: 12px;



  font-family: inherit;



  font-size: 14px;



  color: #172b4d;



  background: #fff;



  outline: none;

}



.store-label input:focus,

.store-label textarea:focus {

  border-color: #1769e0;

}



.store-label textarea {

  resize: vertical;

}



/* =========================

   HOME STORE

========================= */



.home-store-card {

  display: flex;



  align-items: center;



  gap: 14px;



  background: #fff;



  border-radius: 15px;



  padding: 15px;



  margin-bottom: 20px;



  box-shadow:

    0 3px 15px #18365b0d;



  border: 1px solid #edf0f5;

}



.home-store-logo,

.home-store-logo-placeholder {

  width: 68px;



  height: 68px;



  flex: 0 0 68px;



  aspect-ratio: 1 / 1;



  border-radius: 10px;



  object-fit: cover;



  border: 1px solid #e5eaf2;



  background: #f8fafc;

}



.home-store-logo-placeholder {

  display: flex;



  align-items: center;



  justify-content: center;



  font-size: 27px;

}



.home-store-details {

  min-width: 0;



  flex: 1;

}



.home-store-details h2 {

  margin: 0 0 6px;



  color: #1769e0;



  font-size: 18px;



  overflow-wrap: anywhere;

}



.home-store-details p {

  margin: 3px 0 0;



  color: #64748b;



  font-size: 12px;



  line-height: 1.6;



  overflow-wrap: anywhere;

}



.home-store-details

.store-profile-hint {

  color: #94a3b8;

}



/* =========================

   SMALL SCREENS

========================= */



@media (max-width: 380px) {

  .summary-grid {

    grid-template-columns: 1fr;

  }

}



</style>