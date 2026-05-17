from django.urls import path, include
from rest_framework.routers import DefaultRouter
from userauths import views as userauths_views
from userauths import admin_views
from userauths import patient_views
from userauths import social_auth_views
from userauths import message_views
from userauths import appointment_views
from userauths import visit_views
from userauths import patient_portal_views
from userauths import doctor_appointment_views
from userauths import doctor_availability_views
from userauths import audit_views

# from store import views as store_views
# from customer import views as customer_views
# from vendor import views as vendor_views

from rest_framework_simplejwt.views import TokenRefreshView

# Create router for viewsets
router = DefaultRouter()
router.register(r'admin/users', admin_views.UserManagementViewSet, basename='user-management')
router.register(r'admin/roles', admin_views.RoleManagementViewSet, basename='role-management')
router.register(r'admin/regions', admin_views.RegionViewSet, basename='region-management')
router.register(r'admin/districts', admin_views.DistrictViewSet, basename='district-management')
router.register(r'admin/hospitals', admin_views.HospitalViewSet, basename='hospital-management')
router.register(r'admin/departments', admin_views.DepartmentViewSet, basename='department-management')
router.register(r'admin/chiefdoms', admin_views.ChiefdomViewSet, basename='chiefdom-management')
router.register(r'admin/towns', admin_views.TownViewSet, basename='town-management')
router.register(r'patients', patient_views.PatientViewSet, basename='patient-management')
router.register(r'appointments', appointment_views.AppointmentViewSet, basename='appointment-management')
router.register(r'visits', visit_views.PatientVisitViewSet, basename='visit-management')
router.register(r'audit/logs', audit_views.AuditLogViewSet, basename='audit-log')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Authentication endpoints
    path('user/token/', userauths_views.MyTokenObtainPairView.as_view()),
    path('user/token/refresh/', TokenRefreshView.as_view()),
    path('user/register/', userauths_views.RegisterView.as_view()),
    path('user/password-reset/<email>/', userauths_views.PasswordResetEmailVerify.as_view(), name='password_reset'),
    path('user/password-change/', userauths_views.PasswordChangeView.as_view(), name='password_change'),
    path('user/profile/<user_id>/', userauths_views.ProfileView.as_view()),
    
    # Admin dashboard endpoints
    path('admin/dashboard/', admin_views.dashboard_overview, name='admin-dashboard'),
    path('admin/permissions/', admin_views.PermissionListView.as_view(), name='permissions-list'),
    path('admin/bulk-action/', admin_views.bulk_user_action, name='bulk-user-action'),
    path('admin/ministry-dashboard/', admin_views.ministry_dashboard, name='ministry-dashboard'),
    path('user/my-profile/', admin_views.my_profile, name='my-profile'),

    # Social Auth endpoints
    path('auth/google/', social_auth_views.google_login, name='google-login'),
    path('auth/facebook/', social_auth_views.facebook_login, name='facebook-login'),

    # Messaging endpoints
    # Patient visit history
    path('visits/patient_history/<int:patient_id>/', visit_views.PatientVisitViewSet.as_view({'get': 'patient_history'}), name='patient-visit-history'),

    path('messages/inbox/', message_views.inbox, name='messages-inbox'),
    path('messages/sent/', message_views.sent, name='messages-sent'),
    path('messages/unread-count/', message_views.unread_count, name='messages-unread-count'),
    path('messages/recipients/', message_views.recipients, name='messages-recipients'),
    path('messages/send/', message_views.send_message, name='messages-send'),
    path('messages/conversations/', message_views.conversations, name='messages-conversations'),
    path('messages/conversation/<int:user_id>/', message_views.conversation_detail, name='messages-conversation-detail'),
    path('messages/chat/', message_views.send_chat_message, name='messages-chat-send'),
    path('messages/<int:message_id>/', message_views.message_detail, name='messages-detail'),
    path('messages/<int:message_id>/delete/', message_views.delete_message, name='messages-delete'),
    path('messages/<int:message_id>/read/', message_views.mark_read, name='messages-read'),

    # Patient Portal (self-service)
    path('portal/register/', patient_portal_views.patient_self_register, name='patient-self-register'),
    path('portal/hospitals/', patient_portal_views.list_hospitals_public, name='portal-hospitals'),
    path('portal/profile/', patient_portal_views.patient_own_profile, name='portal-profile'),
    path('portal/appointments/', patient_portal_views.patient_own_appointments, name='portal-appointments'),
    path('portal/appointments/book/', patient_portal_views.patient_book_appointment, name='portal-book-appointment'),
    path('portal/appointments/<int:appointment_id>/cancel/', patient_portal_views.patient_cancel_appointment, name='portal-cancel-appointment'),
    path('portal/doctors/', patient_portal_views.list_available_doctors, name='portal-doctors'),
    path('portal/notifications/', patient_portal_views.patient_notifications, name='portal-notifications'),
    path('portal/notifications/read-all/', patient_portal_views.mark_all_notifications_read, name='portal-notifications-read-all'),
    path('portal/notifications/<int:notif_id>/read/', patient_portal_views.mark_notification_read, name='portal-notification-read'),

    # Doctor dashboard
    path('doctor/dashboard/', doctor_appointment_views.doctor_dashboard, name='doctor-dashboard'),

    # Doctor appointment request management
    path('doctor/appointment-requests/', doctor_appointment_views.doctor_appointment_requests, name='doctor-appt-requests'),
    path('doctor/appointment-requests/all/', doctor_appointment_views.doctor_all_requests, name='doctor-appt-all'),
    path('doctor/appointment-requests/<int:appointment_id>/schedule/', doctor_appointment_views.doctor_schedule_appointment, name='doctor-appt-schedule'),
    path('doctor/appointment-requests/<int:appointment_id>/decline/', doctor_appointment_views.doctor_decline_appointment, name='doctor-appt-decline'),
    path('doctor/available-slots/', doctor_appointment_views.doctor_available_slots, name='doctor-available-slots'),
    path('doctor/notifications/', doctor_appointment_views.doctor_notifications, name='doctor-notifications'),
    path('doctor/notifications/read-all/', doctor_appointment_views.doctor_mark_all_read, name='doctor-notifications-read-all'),
    path('doctor/notifications/<int:notif_id>/read/', doctor_appointment_views.doctor_mark_notification_read, name='doctor-notification-read'),

    # Doctor availability / schedule management
    path('doctor/availability/', doctor_availability_views.doctor_availability, name='doctor-availability'),
    path('doctor/availability/<int:day_of_week>/', doctor_availability_views.doctor_availability_day, name='doctor-availability-day'),
    path('doctor/unavailable-dates/', doctor_availability_views.doctor_unavailable_dates, name='doctor-unavailable-dates'),
    path('doctor/unavailable-dates/<int:date_id>/delete/', doctor_availability_views.doctor_unavailable_date_delete, name='doctor-unavailable-date-delete'),
    path('doctor/<int:doctor_id>/schedule/', doctor_availability_views.public_doctor_schedule, name='public-doctor-schedule'),

    # store endpoint
    # path('category/', store_views.CategoryListAPIView.as_view()),
    # path('products/', store_views.ProductListAPIView.as_view()),
    # path('products/<slug>/', store_views.ProductDetailAPIView.as_view()),
    # path('cart-view/', store_views.CartAPIView.as_view()),
    # path('cart-list/<str:cart_id>/<int:user_id>/', store_views.CartListView.as_view()), #when the user exist
    # path('cart-list/<str:cart_id>/', store_views.CartListView.as_view()), #when the user does not exisi
    # path('cart-detail/<str:cart_id>/', store_views.CartDetailView.as_view()), 
    # path('cart-detail/<str:cart_id>/<int:user_id>/', store_views.CartDetailView.as_view()), 
    # path('cart-delete/<str:cart_id>/<int:item_id>/<int:user_id>/', store_views.CartItemDeleteAPIView.as_view()), 
    # path('cart-delete/<str:cart_id>/<int:item_id>/', store_views.CartItemDeleteAPIView.as_view()), 
    # path('create-order/', store_views.CreateOrderAPIView.as_view()),
    # path('checkout/<order_oid>/', store_views.CheckoutView.as_view(), name='checkout'),
    # path('coupon/', store_views.CouponAPIView.as_view(), name='coupon'),
    # path('reviews/<product_id>/', store_views.ReviewListAPIView.as_view()),
    # path('create-reviews/<product_id>/', store_views.ReviewCreateAPIView.as_view()),
    # path('search/', store_views.SearchProductsAPIView.as_view()),


    # ================payment endpoints==================
    # path('stripe-checkout/<order_oid>/', store_views.StripeCheckoutView.as_view()),
    # path('payment-success/<order_oid>/', store_views.PaymentSuccessView.as_view()),


    # ==============customer endpoints=====================
    # path('customer-orders/<user_id>/', customer_views.OrdersAPIView.as_view()),
    # path('customer-order/<user_id>/<order_oid>/', customer_views.OrdersDetailAPIView.as_view()),
    # path('customer-wishlist/<user_id>/', customer_views.WishlistAPIView.as_view()),
    # path('customer-notification/<user_id>/', customer_views.CustomerNotification.as_view()),
    # path('customer-notification/<user_id>/<noti_id>/', customer_views.MarkCustomerNotificationAsSeen.as_view()),

    # # =================vendor endpoints=========================
    # path('vendor-stats/<vendor_id>/', vendor_views.DashboardStatsAPIView.as_view()),
    # path('vendor-orders-chat/<vendor_id>/',vendor_views.MonthlyOrderChartAPIView),
    # path('vendor-product-chat/<vendor_id>/',vendor_views.MonthlyProductChartAPIView),
    # path('vendor-products/<vendor_id>/',vendor_views.ProductsAPIView.as_view()),
    # path('vendor-orders/<vendor_id>/',vendor_views.OrdersAPIView.as_view()),
    # path('vendor-order-detail/<vendor_id>/<order_oid>/',vendor_views.OrderDetailAPIView.as_view()),
    # path('vendor-revenue/<vendor_id>/',vendor_views.RevenueAPIView.as_view()),
    # path('vendor-filter-product/<vendor_id>/',vendor_views.FilterProductsAPIView.as_view()),
    # path('vendor-earning/<vendor_id>/',vendor_views.EarningAPIView.as_view()),
    # path('vendor-earning-tracker/<vendor_id>/',vendor_views.MonthlyEarningTracker),
    # path('vendor-review-list/<vendor_id>/',vendor_views.ReviewsListAPIView.as_view()),
    # path('vendor-review-detail/<vendor_id>/<review_id>',vendor_views.ReviewsDetailAPIView.as_view()),
    # path('vendor-coupon-list/<vendor_id>/',vendor_views.CouponListAPIView.as_view()),
    # path('vendor-coupon-create/<vendor_id>/',vendor_views.CouponCreateAPIView.as_view()),
    # path('vendor-coupon-detail/<vendor_id>/<coupon_id>',vendor_views.CouponDetailAPIView.as_view()),
    # path('vendor-coupon-stats/<vendor_id>/',vendor_views.CouponStatsAPIView.as_view()),
    # path('vendor-unseen-noti/<vendor_id>/',vendor_views.NotificationUnSeenAPIView.as_view()),
    # path('vendor-seen-noti/<vendor_id>/',vendor_views.NotificationSeenAPIView.as_view()),
    # path('vendor-noti-summary/<vendor_id>/',vendor_views.NotificationSummaryAPIView.as_view()),
    # path('vendor-noti-mark-as-seen/<vendor_id>/',vendor_views.NotificationVendorMarkAsSeen.as_view()),
    # path('vendor-settings/<int:pk>/',vendor_views.VendorProfileUpdateView.as_view()),
    # path('vendor-shop-settings/<int:pk>/',vendor_views.ShopUpdateView.as_view()),
    # path('shop/<vendor_slug>/',vendor_views.ShopAPIView.as_view()),
    # path('vendor-products/<vendor_slug>/',vendor_views.ShopProductsAPIView.as_view()),

    
]