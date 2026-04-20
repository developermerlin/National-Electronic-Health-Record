from django.urls import path, include
from rest_framework.routers import DefaultRouter
from userauths import views as userauths_views
from userauths import admin_views
from userauths import patient_views
from userauths import social_auth_views
from userauths import message_views

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