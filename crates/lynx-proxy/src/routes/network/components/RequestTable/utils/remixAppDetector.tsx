import React from 'react';
import {
    RiAlipayLine,
    RiAmazonLine,
    RiAndroidLine,
    RiAppleLine,
    RiBaiduLine,
    RiBootstrapLine,
    RiChromeLine,
    RiCodepenLine,
    RiCopilotLine,
    RiDiscordLine,
    RiDoubanLine,
    RiDribbbleLine,
    RiDriveLine,
    RiDropboxLine,
    RiEdgeLine,
    RiEvernoteLine,
    RiFacebookLine,
    RiFigmaLine,
    RiFirebaseLine,
    RiFirefoxLine,
    RiFlutterLine,
    RiGatsbyLine,
    RiGithubLine,
    RiGitlabLine,
    RiGoogleLine,
    RiInstagramLine,
    RiJavaLine,
    RiKakaoTalkLine,
    RiLineLine,
    RiLinkedinLine,
    RiMastercardLine,
    RiMediumLine,
    RiMessengerLine,
    RiMicrosoftLine,
    RiNeteaseCloudMusicLine,
    RiNetflixLine,
    RiNextjsLine,
    RiNodejsLine,
    RiNotionLine,
    RiNpmjsLine,
    RiOpenaiLine,
    RiOperaLine,
    RiPaypalLine,
    RiPinterestLine,
    RiPlaystationLine,
    RiQqLine,
    RiReactjsLine,
    RiRedditLine,
    RiSafariLine,
    RiSkypeLine,
    RiSlackLine,
    RiSoundcloudLine,
    RiSpotifyLine,
    RiStackOverflowLine,
    RiSteamLine,
    RiSupabaseLine,
    RiSvelteLine,
    RiTailwindCssLine,
    RiTaobaoLine,
    RiTelegramLine,
    RiTiktokLine,
    RiTrelloLine,
    RiTwitchLine,
    RiTwitterLine,
    RiUbuntuLine,
    RiVercelLine,
    RiVimeoLine,
    RiVisaLine,
    RiVuejsLine,
    RiWechatLine,
    RiWeiboLine,
    RiWhatsappLine,
    RiWindowsLine,
    RiWordpressLine,
    RiXboxLine,
    RiYoutubeLine,
    RiZhihuLine,
    RiQuestionLine,
} from '@remixicon/react';

/**
 * RemixIcon 应用检测器
 * 
 * 基于 RemixIcon 图标库的应用检测，支持 100+ 应用图标
 * 
 * 浏览器检测说明：
 * - Edge (新版) 使用 "Edg/" 标识，而不是 "Edge"
 * - Opera 使用 "OPR/" 标识  
 * - Chrome 检测放在最后，因为其他浏览器的 User-Agent 也可能包含 "Chrome"
 * - 匹配顺序很重要：更具体的模式应该放在前面
 */

// 用户代理字符串匹配规则
const userAgentRules = [
    // 浏览器 - 注意顺序：更具体的匹配放在前面
    { pattern: /edg\//i, icon: RiEdgeLine, name: 'Edge' }, // Edge 现在使用 "Edg/" 标识
    { pattern: /opr\//i, icon: RiOperaLine, name: 'Opera' }, // Opera 使用 "OPR/" 标识
    { pattern: /firefox/i, icon: RiFirefoxLine, name: 'Firefox' },
    { pattern: /safari/i, icon: RiSafariLine, name: 'Safari' },
    { pattern: /chrome/i, icon: RiChromeLine, name: 'Chrome' }, // Chrome 放在最后

    // API 客户端
    { pattern: /postman/i, icon: "Postman", name: 'Postman' },
    { pattern: /insomnia/i, icon: "Insomnia", name: 'Insomnia' },
    { pattern: /curl/i, icon: "cURL", name: 'cURL' },

    // 移动设备
    { pattern: /android/i, icon: RiAndroidLine, name: 'Android' },
    { pattern: /iphone|ipad|ipod/i, icon: RiAppleLine, name: 'iOS' },

    // 操作系统
    { pattern: /windows/i, icon: RiWindowsLine, name: 'Windows' },
    { pattern: /linux/i, icon: RiUbuntuLine, name: 'Linux' },
    { pattern: /macintosh|mac os/i, icon: RiAppleLine, name: 'macOS' },

    // 编程语言和框架
    { pattern: /node/i, icon: RiNodejsLine, name: 'Node.js' },
    { pattern: /python/i, icon: RiQuestionLine, name: 'Python' },
    { pattern: /java/i, icon: RiJavaLine, name: 'Java' },
    { pattern: /php/i, icon: RiQuestionLine, name: 'PHP' },
    { pattern: /ruby/i, icon: RiQuestionLine, name: 'Ruby' },
    { pattern: /golang|go/i, icon: RiQuestionLine, name: 'Go' },
    { pattern: /rust/i, icon: RiQuestionLine, name: 'Rust' },

    // 开发工具
    { pattern: /electron/i, icon: RiQuestionLine, name: 'Electron' },
    { pattern: /vscode/i, icon: RiMicrosoftLine, name: 'VS Code' },

    // 通信应用
    { pattern: /slack/i, icon: RiSlackLine, name: 'Slack' },
    { pattern: /telegram/i, icon: RiTelegramLine, name: 'Telegram' },
    { pattern: /whatsapp/i, icon: RiWhatsappLine, name: 'WhatsApp' },
    { pattern: /discord/i, icon: RiDiscordLine, name: 'Discord' },
    { pattern: /wechat/i, icon: RiWechatLine, name: 'WeChat' },
    { pattern: /qq/i, icon: RiQqLine, name: 'QQ' },
    { pattern: /skype/i, icon: RiSkypeLine, name: 'Skype' },
    { pattern: /messenger/i, icon: RiMessengerLine, name: 'Messenger' },
    { pattern: /line/i, icon: RiLineLine, name: 'Line' },
    { pattern: /kakao/i, icon: RiKakaoTalkLine, name: 'KakaoTalk' },
];

// 其他请求头匹配规则
const headerRules = [
    // 服务器
    { header: 'server', pattern: /apache/i, icon: RiQuestionLine, name: 'Apache' },
    { header: 'server', pattern: /nginx/i, icon: RiQuestionLine, name: 'Nginx' },

    // 内容类型相关
    { header: 'x-powered-by', pattern: /php/i, icon: RiQuestionLine, name: 'PHP' },
    { header: 'x-powered-by', pattern: /express/i, icon: RiNodejsLine, name: 'Express' },
    { header: 'x-powered-by', pattern: /next\.js/i, icon: RiNextjsLine, name: 'Next.js' },

    // 框架特定头
    { header: 'x-framework', pattern: /laravel/i, icon: RiQuestionLine, name: 'Laravel' },
    { header: 'x-framework', pattern: /django/i, icon: RiQuestionLine, name: 'Django' },
    { header: 'x-framework', pattern: /rails/i, icon: RiQuestionLine, name: 'Ruby on Rails' },
    { header: 'x-framework', pattern: /react/i, icon: RiReactjsLine, name: 'React' },
    { header: 'x-framework', pattern: /vue/i, icon: RiVuejsLine, name: 'Vue.js' },
    { header: 'x-framework', pattern: /angular/i, icon: RiQuestionLine, name: 'Angular' },
    { header: 'x-framework', pattern: /svelte/i, icon: RiSvelteLine, name: 'Svelte' },
    { header: 'x-framework', pattern: /gatsby/i, icon: RiGatsbyLine, name: 'Gatsby' },
    { header: 'x-framework', pattern: /nuxt/i, icon: RiVuejsLine, name: 'Nuxt.js' },

    // CDN 和云服务
    { header: 'cf-ray', pattern: /.+/i, icon: RiQuestionLine, name: 'Cloudflare' },
    { header: 'x-served-by', pattern: /vercel/i, icon: RiVercelLine, name: 'Vercel' },
    { header: 'x-served-by', pattern: /netlify/i, icon: RiQuestionLine, name: 'Netlify' },
    { header: 'x-served-by', pattern: /aws/i, icon: RiAmazonLine, name: 'AWS' },
    { header: 'x-served-by', pattern: /azure/i, icon: RiMicrosoftLine, name: 'Azure' },
    { header: 'x-served-by', pattern: /google/i, icon: RiGoogleLine, name: 'Google Cloud' },

    // 社交媒体和平台
    { header: 'x-platform', pattern: /github/i, icon: RiGithubLine, name: 'GitHub' },
    { header: 'x-platform', pattern: /gitlab/i, icon: RiGitlabLine, name: 'GitLab' },
    { header: 'x-platform', pattern: /bitbucket/i, icon: RiQuestionLine, name: 'Bitbucket' },
    { header: 'x-platform', pattern: /facebook/i, icon: RiFacebookLine, name: 'Facebook' },
    { header: 'x-platform', pattern: /instagram/i, icon: RiInstagramLine, name: 'Instagram' },
    { header: 'x-platform', pattern: /twitter/i, icon: RiTwitterLine, name: 'Twitter' },
    { header: 'x-platform', pattern: /youtube/i, icon: RiYoutubeLine, name: 'YouTube' },
    { header: 'x-platform', pattern: /tiktok/i, icon: RiTiktokLine, name: 'TikTok' },
    { header: 'x-platform', pattern: /linkedin/i, icon: RiLinkedinLine, name: 'LinkedIn' },
    { header: 'x-platform', pattern: /reddit/i, icon: RiRedditLine, name: 'Reddit' },
    { header: 'x-platform', pattern: /pinterest/i, icon: RiPinterestLine, name: 'Pinterest' },
    { header: 'x-platform', pattern: /medium/i, icon: RiMediumLine, name: 'Medium' },
    { header: 'x-platform', pattern: /notion/i, icon: RiNotionLine, name: 'Notion' },
    { header: 'x-platform', pattern: /figma/i, icon: RiFigmaLine, name: 'Figma' },
    { header: 'x-platform', pattern: /dribbble/i, icon: RiDribbbleLine, name: 'Dribbble' },
    { header: 'x-platform', pattern: /behance/i, icon: RiQuestionLine, name: 'Behance' },
    { header: 'x-platform', pattern: /codepen/i, icon: RiCodepenLine, name: 'CodePen' },
    { header: 'x-platform', pattern: /stackoverflow/i, icon: RiStackOverflowLine, name: 'Stack Overflow' },

    // 电商和支付
    { header: 'x-platform', pattern: /shopify/i, icon: RiQuestionLine, name: 'Shopify' },
    { header: 'x-platform', pattern: /woocommerce/i, icon: RiWordpressLine, name: 'WooCommerce' },
    { header: 'x-platform', pattern: /magento/i, icon: RiQuestionLine, name: 'Magento' },
    { header: 'x-platform', pattern: /paypal/i, icon: RiPaypalLine, name: 'PayPal' },
    { header: 'x-platform', pattern: /stripe/i, icon: RiQuestionLine, name: 'Stripe' },
    { header: 'x-platform', pattern: /alipay/i, icon: RiAlipayLine, name: 'Alipay' },
    { header: 'x-platform', pattern: /wechatpay/i, icon: RiWechatLine, name: 'WeChat Pay' },
    { header: 'x-platform', pattern: /visa/i, icon: RiVisaLine, name: 'Visa' },
    { header: 'x-platform', pattern: /mastercard/i, icon: RiMastercardLine, name: 'Mastercard' },

    // 娱乐和媒体
    { header: 'x-platform', pattern: /netflix/i, icon: RiNetflixLine, name: 'Netflix' },
    { header: 'x-platform', pattern: /spotify/i, icon: RiSpotifyLine, name: 'Spotify' },
    { header: 'x-platform', pattern: /soundcloud/i, icon: RiSoundcloudLine, name: 'SoundCloud' },
    { header: 'x-platform', pattern: /youtube/i, icon: RiYoutubeLine, name: 'YouTube' },
    { header: 'x-platform', pattern: /vimeo/i, icon: RiVimeoLine, name: 'Vimeo' },
    { header: 'x-platform', pattern: /twitch/i, icon: RiTwitchLine, name: 'Twitch' },
    { header: 'x-platform', pattern: /steam/i, icon: RiSteamLine, name: 'Steam' },
    { header: 'x-platform', pattern: /playstation/i, icon: RiPlaystationLine, name: 'PlayStation' },
    { header: 'x-platform', pattern: /xbox/i, icon: RiXboxLine, name: 'Xbox' },

    // 中国应用
    { header: 'x-platform', pattern: /baidu/i, icon: RiBaiduLine, name: 'Baidu' },
    { header: 'x-platform', pattern: /weibo/i, icon: RiWeiboLine, name: 'Weibo' },
    { header: 'x-platform', pattern: /taobao/i, icon: RiTaobaoLine, name: 'Taobao' },
    { header: 'x-platform', pattern: /douban/i, icon: RiDoubanLine, name: 'Douban' },
    { header: 'x-platform', pattern: /zhihu/i, icon: RiZhihuLine, name: 'Zhihu' },
    { header: 'x-platform', pattern: /bilibili/i, icon: RiQuestionLine, name: 'Bilibili' },
    { header: 'x-platform', pattern: /netease/i, icon: RiNeteaseCloudMusicLine, name: 'NetEase' },

    // 开发工具和服务
    { header: 'x-platform', pattern: /npm/i, icon: RiNpmjsLine, name: 'npm' },
    { header: 'x-platform', pattern: /firebase/i, icon: RiFirebaseLine, name: 'Firebase' },
    { header: 'x-platform', pattern: /supabase/i, icon: RiSupabaseLine, name: 'Supabase' },
    { header: 'x-platform', pattern: /trello/i, icon: RiTrelloLine, name: 'Trello' },
    { header: 'x-platform', pattern: /jira/i, icon: RiQuestionLine, name: 'Jira' },
    { header: 'x-platform', pattern: /confluence/i, icon: RiQuestionLine, name: 'Confluence' },
    { header: 'x-platform', pattern: /dropbox/i, icon: RiDropboxLine, name: 'Dropbox' },
    { header: 'x-platform', pattern: /googledrive/i, icon: RiDriveLine, name: 'Google Drive' },
    { header: 'x-platform', pattern: /onedrive/i, icon: RiMicrosoftLine, name: 'OneDrive' },
    { header: 'x-platform', pattern: /evernote/i, icon: RiEvernoteLine, name: 'Evernote' },
    { header: 'x-platform', pattern: /bootstrap/i, icon: RiBootstrapLine, name: 'Bootstrap' },
    { header: 'x-platform', pattern: /tailwind/i, icon: RiTailwindCssLine, name: 'Tailwind CSS' },
    { header: 'x-platform', pattern: /flutter/i, icon: RiFlutterLine, name: 'Flutter' },
    { header: 'x-platform', pattern: /openai/i, icon: RiOpenaiLine, name: 'OpenAI' },
    { header: 'x-platform', pattern: /copilot/i, icon: RiCopilotLine, name: 'GitHub Copilot' },
];

// 默认图标
const defaultIcon = RiQuestionLine;

interface AppInfo {
    name: string;
    icon: React.ComponentType<any> | string;
    confidence: number;
}

interface RequestHeaders {
    [key: string]: string;
}

/**
 * 通过请求头检测应用类型
 * @param headers 请求头对象
 * @returns 检测到的应用信息
 */
export function detectAppFromHeaders(headers: RequestHeaders): AppInfo {
    const lowerHeaders: RequestHeaders = {};

    // 将所有头部键转换为小写以便匹配
    Object.keys(headers).forEach(key => {
        lowerHeaders[key.toLowerCase()] = headers[key];
    });

    const userAgent = lowerHeaders['user-agent'] || '';

    // 首先检查用户代理字符串
    for (const rule of userAgentRules) {
        if (rule.pattern.test(userAgent)) {
            return {
                name: rule.name,
                icon: rule.icon,
                confidence: 0.8
            };
        }
    }

    // 然后检查其他请求头
    for (const rule of headerRules) {
        const headerValue = lowerHeaders[rule.header.toLowerCase()];
        if (headerValue && rule.pattern.test(headerValue)) {
            return {
                name: rule.name,
                icon: rule.icon,
                confidence: 0.6
            };
        }
    }

    // 如果没有匹配到，返回默认图标
    return {
        name: 'Unknown',
        icon: defaultIcon,
        confidence: 0.1
    };
}

/**
 * 应用图标组件
 */
interface AppIconProps {
    headers: RequestHeaders;
    size?: number;
    className?: string;
    showName?: boolean;
    useColor?: boolean;
}

export const AppIcon: React.FC<AppIconProps> = ({
    headers,
    size = 16,
    className = '',
    showName = false,
    useColor = true
}) => {
    const appInfo = detectAppFromHeaders(headers);
    const IconComponent = appInfo.icon;
    const iconColor = useColor ? getAppColor(headers) : undefined;

    return (
        <div className="flex items-center gap-2 justify-center">
            {typeof appInfo.icon === 'string' ? appInfo.icon : <IconComponent
                size={size}
                className={`inline-block ${className}`}
                style={iconColor ? { color: iconColor } : undefined}
            />}
            {showName && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                    {appInfo.name}
                </span>
            )}
        </div>
    );
};

/**
 * 获取应用颜色（基于常见的应用颜色）
 */
export function getAppColor(headers: RequestHeaders): string {
    const appInfo = detectAppFromHeaders(headers);

    // 一些常见的应用颜色映射
    const colorMap: { [key: string]: string } = {
        'Chrome': '#4285F4',
        'Firefox': '#FF7139',
        'Safari': '#006CFF',
        'Edge': '#0078D4',
        'Opera': '#FF1B2D',
        'Android': '#3DDC84',
        'iOS': '#007AFF',
        'Windows': '#0078D4',
        'Linux': '#FCC624',
        'macOS': '#000000',
        'Node.js': '#339933',
        'Java': '#007396',
        'VS Code': '#007ACC',
        'Slack': '#4A154B',
        'Telegram': '#26A5E4',
        'WhatsApp': '#25D366',
        'Discord': '#5865F2',
        'WeChat': '#07C160',
        'QQ': '#EB1700',
        'Skype': '#00AFF0',
        'Messenger': '#006AFF',
        'Line': '#00C300',
        'KakaoTalk': '#FFCD00',
        'Express': '#000000',
        'Next.js': '#000000',
        'React': '#61DAFB',
        'Vue.js': '#4FC08D',
        'Angular': '#DD0031',
        'Svelte': '#FF3E00',
        'Gatsby': '#663399',
        'Nuxt.js': '#00C58E',
        'Vercel': '#000000',
        'AWS': '#FF9900',
        'Azure': '#0078D4',
        'Google Cloud': '#4285F4',
        'GitHub': '#181717',
        'GitLab': '#FCA326',
        'Facebook': '#1877F2',
        'Instagram': '#E4405F',
        'Twitter': '#1DA1F2',
        'YouTube': '#FF0000',
        'TikTok': '#000000',
        'LinkedIn': '#0A66C2',
        'Reddit': '#FF4500',
        'Pinterest': '#BD081C',
        'Medium': '#000000',
        'Notion': '#000000',
        'Figma': '#F24E1E',
        'Dribbble': '#EA4C89',
        'CodePen': '#000000',
        'Stack Overflow': '#F58025',
        'PayPal': '#003087',
        'Alipay': '#1677FF',
        'Visa': '#1A1F71',
        'Mastercard': '#EB001B',
        'Netflix': '#E50914',
        'Spotify': '#1DB954',
        'SoundCloud': '#FF5500',
        'Vimeo': '#1AB7EA',
        'Twitch': '#9146FF',
        'Steam': '#000000',
        'PlayStation': '#003791',
        'Xbox': '#107C10',
        'Baidu': '#2319DC',
        'Weibo': '#E6162D',
        'Taobao': '#FF4900',
        'Douban': '#007722',
        'Zhihu': '#0084FF',
        'NetEase': '#C20C0C',
        'npm': '#CB3837',
        'Firebase': '#FFCA28',
        'Supabase': '#3ECF8E',
        'Trello': '#0052CC',
        'Dropbox': '#0061FF',
        'Google Drive': '#4285F4',
        'OneDrive': '#0078D4',
        'Evernote': '#00A82D',
        'Bootstrap': '#7952B3',
        'Tailwind CSS': '#06B6D4',
        'Flutter': '#02569B',
        'OpenAI': '#412991',
        'GitHub Copilot': '#000000',
    };

    return colorMap[appInfo.name] || '#6B7280';
}

export default AppIcon;
