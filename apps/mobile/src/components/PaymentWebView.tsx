import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewErrorEvent, WebViewHttpErrorEvent } from 'react-native-webview/lib/WebViewTypes';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/ThemeContext';
import { fontSize, spacing } from '../theme/tokens';

const MOBILE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

const ALIPAY_GATEWAY_BASE = 'https://openapi-sandbox.dl.alipaydev.com';
const MAX_AUTO_RETRY = 2;
const LOAD_TIMEOUT_MS = 25000;

type LoadMode = 'get' | 'form';

interface PaymentWebViewProps {
  visible: boolean;
  payUrl: string;
  payFormHtml?: string;
  onClose: () => void;
  onCheckPayment: () => void;
  /** 504 等错误时向后端重新申请支付链接 */
  onRefreshPay?: () => Promise<void>;
}

function isAlipaySuccessUrl(url: string): boolean {
  if (/gateway\.do/i.test(url)) return false;
  return /trade_status=TRADE_(SUCCESS|FINISHED)/i.test(url);
}

function isAlipayErrorUrl(url: string): boolean {
  return /\/error\b/i.test(url) || /error_code=/i.test(url) || /sub_code=/i.test(url);
}

function isGatewayTimeout(status: number, url: string, title?: string): boolean {
  if (status === 504) return true;
  if (/504|Gateway Time-out|gateway time-out/i.test(url)) return true;
  if (title && /504|Gateway Time-out/i.test(title)) return true;
  return false;
}

export default function PaymentWebView({
  visible,
  payUrl,
  payFormHtml,
  onClose,
  onCheckPayment,
  onRefreshPay,
}: PaymentWebViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState('');
  const [loadMode, setLoadMode] = useState<LoadMode>('get');
  const [reloadKey, setReloadKey] = useState(0);
  const autoRetryRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      // 与后端 probe 一致：先用 GET 链接，失败再切 POST 表单
      setLoadMode('get');
      setLoadError(null);
      setLoading(true);
      autoRetryRef.current = 0;
      setReloadKey((k) => k + 1);
    }
  }, [visible, payUrl, payFormHtml]);

  const bumpReload = useCallback((nextMode?: LoadMode) => {
    if (nextMode) setLoadMode(nextMode);
    setLoadError(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  const setTimeoutError = useCallback(() => {
    setLoading(false);
    setLoadError(t('payment.webview504Error'));
  }, [t]);

  const handleNavigation = useCallback(
    (url: string, title?: string) => {
      if (!url) return;
      setCurrentUrl(url);
      if (isGatewayTimeout(0, url, title)) {
        setTimeoutError();
        return;
      }
      if (isAlipayErrorUrl(url)) {
        setLoading(false);
        setLoadError(t('payment.webviewAlipayError'));
        return;
      }
      if (/gateway\.do/i.test(url) && payFormHtml && loadMode === 'get') {
        bumpReload('form');
        return;
      }
      if (isAlipaySuccessUrl(url)) {
        onCheckPayment();
      }
    },
    [bumpReload, loadMode, onCheckPayment, payFormHtml, setTimeoutError, t],
  );

  const tryAutoRecover = useCallback(
    async (reason: '504' | 'http' | 'net') => {
      if (autoRetryRef.current < MAX_AUTO_RETRY) {
        autoRetryRef.current += 1;
        const nextMode: LoadMode = loadMode === 'get' ? 'form' : 'get';
        bumpReload(nextMode);
        return;
      }
      if (onRefreshPay && !refreshingRef.current) {
        refreshingRef.current = true;
        try {
          await onRefreshPay();
          autoRetryRef.current = 0;
          bumpReload('get');
          return;
        } catch {
          /* fall through */
        } finally {
          refreshingRef.current = false;
        }
      }
      if (reason === '504') {
        setTimeoutError();
      }
    },
    [bumpReload, loadMode, onRefreshPay, setTimeoutError],
  );

  useEffect(() => {
    if (!visible || loadError || !loading) return;
    const timer = setTimeout(() => {
      void tryAutoRecover('504');
      setLoadError((prev) => prev ?? t('payment.webview504Error'));
      setLoading(false);
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [visible, loadError, loading, tryAutoRecover, t]);

  const handleWebError = useCallback(
    (event: WebViewErrorEvent) => {
      setLoading(false);
      const desc = event.nativeEvent.description || '';
      if (desc.includes('net::') || /timeout|timed out/i.test(desc)) {
        tryAutoRecover('net');
        if (!loadError) setLoadError(t('payment.webviewNetworkError'));
      } else {
        setLoadError(t('payment.webviewLoadError'));
      }
    },
    [loadError, t, tryAutoRecover],
  );

  const handleHttpError = useCallback(
    (event: WebViewHttpErrorEvent) => {
      const status = event.nativeEvent.statusCode;
      if (status >= 400) {
        if (status === 504) {
          tryAutoRecover('504');
        }
        setLoading(false);
        setLoadError(
          status === 504 ? t('payment.webview504Error') : t('payment.webviewHttpError', { status }),
        );
      }
    },
    [t, tryAutoRecover],
  );

  const handleRetry = useCallback(() => {
    autoRetryRef.current = 0;
    bumpReload(loadMode);
  }, [bumpReload, loadMode]);

  const handleOpenBrowser = useCallback(async () => {
    if (!payUrl) return;
    try {
      await Linking.openURL(payUrl);
    } catch {
      setLoadError(t('payment.webviewOpenBrowserFailed'));
    }
  }, [payUrl, t]);

  const webSource =
    loadMode === 'form' && payFormHtml
      ? { html: payFormHtml, baseUrl: ALIPAY_GATEWAY_BASE }
      : payUrl
        ? { uri: payUrl }
        : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.toolbarBtn}>
            <Text style={[styles.toolbarBtnText, { color: colors.text }]}>{t('payment.close')}</Text>
          </TouchableOpacity>
          <Text style={[styles.toolbarTitle, { color: colors.text }]}>{t('payment.alipay')}</Text>
          <TouchableOpacity onPress={onCheckPayment} style={styles.toolbarBtn}>
            <Text style={[styles.toolbarBtnText, { color: colors.primary }]}>
              {t('payment.paidDone')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.webWrap}>
          {webSource ? (
            <WebView
              ref={webRef}
              key={`${loadMode}-${payUrl}-${reloadKey}`}
              style={styles.webview}
              source={webSource}
              userAgent={MOBILE_USER_AGENT}
              originWhitelist={['https://*', 'http://*', 'alipays://*']}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              startInLoadingState
              onLoadStart={() => {
                setLoading(true);
                setLoadError(null);
              }}
              onLoadEnd={() => setLoading(false)}
              onError={handleWebError}
              onHttpError={handleHttpError}
              onNavigationStateChange={(nav) => handleNavigation(nav.url, nav.title)}
            />
          ) : null}

          {loading && !loadError ? (
            <View style={styles.overlay} pointerEvents="none">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.overlayText, { color: colors.textSecondary }]}>
                {t('payment.webviewLoading')}
              </Text>
            </View>
          ) : null}

          {loadError ? (
            <View style={[styles.overlay, styles.errorPanel, { backgroundColor: colors.surface }]}>
              <Text style={[styles.errorTitle, { color: colors.text }]}>{loadError}</Text>
              <Text style={[styles.errorHint, { color: colors.textSecondary }]}>
                {t('payment.webview504Hint')}
              </Text>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={handleRetry}
              >
                <Text style={styles.actionBtnText}>{t('payment.webviewRetry')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtnOutline, { borderColor: colors.primary }]}
                onPress={handleOpenBrowser}
              >
                <Text style={[styles.actionBtnOutlineText, { color: colors.primary }]}>
                  {t('payment.webviewOpenBrowser')}
                </Text>
              </TouchableOpacity>
              {onRefreshPay ? (
                <TouchableOpacity
                  style={[styles.actionBtnOutline, { borderColor: colors.border, marginTop: spacing.sm }]}
                  onPress={async () => {
                    try {
                      await onRefreshPay();
                      autoRetryRef.current = 0;
                      bumpReload('get');
                    } catch {
                      setLoadError(t('payment.webviewRefreshFailed'));
                    }
                  }}
                >
                  <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>
                    {t('payment.webviewRefreshLink')}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>

        <Text style={[styles.hint, { color: colors.textLight }]}>{t('payment.webviewHint')}</Text>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 48,
    borderBottomWidth: 1,
  },
  toolbarTitle: { fontSize: fontSize.md, fontWeight: '600' },
  toolbarBtn: { minWidth: 72 },
  toolbarBtnText: { fontSize: fontSize.sm },
  webWrap: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: '#fff' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  overlayText: { marginTop: spacing.sm, fontSize: fontSize.sm },
  errorPanel: { backgroundColor: '#fff' },
  errorTitle: { fontSize: fontSize.md, fontWeight: '600', textAlign: 'center', marginBottom: spacing.sm },
  errorHint: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  actionBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
    minWidth: 200,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  actionBtnOutline: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 200,
    alignItems: 'center',
  },
  actionBtnOutlineText: { fontSize: fontSize.md, fontWeight: '600' },
  hint: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
