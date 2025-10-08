import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { SubscriptionService } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import {
  Home, Users, Gift, Settings, LogOut, Menu, X, ChefHat, MapPin,
  Headphones as HeadphonesIcon, Wallet, BarChart3, Crown, Clock,
  CreditCard, Search, Bell, Mail
} from 'lucide-react';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [lastSubscriptionCheck, setLastSubscriptionCheck] = useState<number>(0);
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  React.useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  React.useEffect(() => {
    const handleSubscriptionUpdate = () => {
      console.log('🔄 Subscription update event received, refreshing...');
      checkSubscription(true);
      setShowUpgradeSuccess(true);
      setTimeout(() => setShowUpgradeSuccess(false), 5000);
    };

    window.addEventListener('subscription-updated', handleSubscriptionUpdate);
    return () => window.removeEventListener('subscription-updated', handleSubscriptionUpdate);
  }, []);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      console.log('🎉 Payment success detected, refreshing subscription...');

      window.history.replaceState({}, '', window.location.pathname);

      checkSubscription(true);

      let pollCount = 0;
      const maxPolls = 20;
      const pollInterval = setInterval(() => {
        pollCount++;
        console.log(`🔄 Polling for subscription update (${pollCount}/${maxPolls})`);
        checkSubscription(true);

        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          console.log('⏰ Stopped polling for subscription updates');
        }
      }, 6000);

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('subscription-updated'));
      }, 1000);

      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    }
  }, []);

  const checkSubscription = async (forceRefresh: boolean = false) => {
    if (!user) return;

    const now = Date.now();
    const SUBSCRIPTION_CACHE_DURATION = 5 * 1000;

    if (!forceRefresh && subscriptionData && (now - lastSubscriptionCheck) < SUBSCRIPTION_CACHE_DURATION) {
      console.log('📊 Using cached subscription data');
      return;
    }

    try {
      setSubscriptionLoading(true);
      console.log('🔄 Fetching fresh subscription data...', forceRefresh ? '(forced)' : '(cache expired)');

      const data = await SubscriptionService.checkSubscriptionAccess(user.id);
      console.log('📊 Subscription data loaded:', {
        hasAccess: data.hasAccess,
        planType: data.subscription?.plan_type,
        status: data.subscription?.status,
        daysRemaining: data.daysRemaining,
        billingPeriodText: data.billingPeriodText,
        billingPeriodAccurate: data.billingPeriodAccurate
      });

      setSubscriptionData(data);
      setLastSubscriptionCheck(now);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Menu Items', href: '/dashboard/menu-items', icon: ChefHat },
    { name: 'Rewards', href: '/dashboard/rewards', icon: Gift },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Branches', href: '/dashboard/branches', icon: MapPin },
    { name: 'Loyalty Config', href: '/dashboard/loyalty-config', icon: Settings },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Support', href: '/dashboard/support', icon: HeadphonesIcon },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === href;
  };

  React.useEffect(() => {
    if (subscriptionData) {
      console.log('🔍 Current subscription status in layout:', {
        planType: subscriptionData.subscription?.plan_type,
        status: subscriptionData.subscription?.status,
        hasAccess: subscriptionData.hasAccess,
        isExpired: subscriptionData.isExpired,
        daysRemaining: subscriptionData.daysRemaining
      });
    }
  }, [subscriptionData]);

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-72 flex-col bg-[#1A1D29] shadow-2xl">
          <div className="flex h-20 items-center justify-between px-6">
            <div className="flex items-center space-x-3">
              <img src="/leyls-svg.svg" alt="Leyls" className="h-8 w-auto object-contain brightness-0 invert" />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-gray-400 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive(item.href)
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </button>
              );
            })}
          </nav>

          <div className="p-6 space-y-4">
            {subscriptionData?.subscription?.plan_type === 'trial' &&
             subscriptionData?.daysRemaining !== undefined &&
             subscriptionData?.daysRemaining <= 7 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E6A85C] via-[#E85A9B] to-[#D946EF] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">40%</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">Complete profile</p>
                    <p className="text-gray-400 text-xs">Complete to unlock features</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/upgrade')}
                  className="w-full bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  Upgrade Now
                </button>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-4 border-t border-white/10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E6A85C] via-[#E85A9B] to-[#D946EF] flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button className="text-gray-400 hover:text-white">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-[#1A1D29] px-6 py-8 m-4 rounded-3xl shadow-2xl">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E6A85C] via-[#E85A9B] to-[#D946EF] flex items-center justify-center shadow-lg">
              <img src="/SwooshLogo.svg" alt="Logo" className="h-7 w-7 brightness-0 invert" />
            </div>
            <div className="flex flex-col">
              <img src="/leyls-svg.svg" alt="Leyls" className="h-6 w-auto object-contain brightness-0 invert" />
            </div>
          </div>

          <nav className="flex-1 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                    isActive(item.href)
                      ? 'bg-white/10 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </button>
              );
            })}
          </nav>

          <div className="space-y-4 pt-6 border-t border-white/10">
            {subscriptionData?.subscription?.plan_type === 'trial' &&
             subscriptionData?.daysRemaining !== undefined &&
             subscriptionData?.daysRemaining <= 7 && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E6A85C] via-[#E85A9B] to-[#D946EF] flex items-center justify-center">
                    <span className="text-white text-sm font-bold">40%</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">Complete profile</p>
                    <p className="text-gray-400 text-xs">Unlock all features</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/upgrade')}
                  className="w-full bg-gradient-to-r from-[#E6A85C] via-[#E85A9B] to-[#D946EF] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                >
                  Upgrade Now
                </button>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E6A85C] via-[#E85A9B] to-[#D946EF] flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-semibold">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button className="text-gray-400 hover:text-white transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-80">
        <div className="sticky top-0 z-40 bg-[#F5F5F7] px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              className="lg:hidden p-2 text-gray-600 hover:bg-white rounded-xl transition-colors shadow-sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border-0 shadow-sm text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#E85A9B] focus:outline-none"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 rounded">⌘</kbd>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 rounded">F</kbd>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2.5 text-gray-600 hover:bg-white rounded-xl transition-all shadow-sm">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-2.5 text-gray-600 hover:bg-white rounded-xl transition-all shadow-sm">
                <Mail className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <main className="px-4 sm:px-6 lg:px-8 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
