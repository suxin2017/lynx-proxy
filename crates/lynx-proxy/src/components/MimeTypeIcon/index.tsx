import {
  RiFileImageLine,
  RiHtml5Line,
  RiCss3Line,
  RiJavascriptLine,
  RiVideoLine,
  RiFontSansSerif,
} from '@remixicon/react';
import { SVGProps } from 'react';

interface FileIconProps {
  mimeType?: string;
  size?: number;
}

const InnerMimeTypeIcon: React.FC<FileIconProps> = ({ mimeType, size }) => {
  const [category, type] =
    mimeType?.split('/')?.map((item) => item.toLowerCase()) ?? [];

  switch (category) {
    case 'font':
      return <RiFontSansSerif size={size} className="text-slate-600" />;
    case 'image':
      return <RiFileImageLine size={size} className="text-green-400" />;
    case 'video':
      return <RiVideoLine size={size} className="text-rose-400" />;
    case 'model':
      return <CarbonModelAlt fontSize={size} className="text-gray-600" />;
    case 'text':
      switch (type) {
        case 'html':
          return <RiHtml5Line size={size} className="text-red-400" />;
        case 'css':
          return <RiCss3Line size={size} className="text-teal-400" />;
        case 'javascript':
          return <RiJavascriptLine className="text-yellow-400" size={size} />;
        case 'xml':
          return <HugeiconsXml02 className="text-green-400" fontSize={size} />;
        default:
          return (
            <MaterialSymbolsUnknownDocumentOutlineSharp
              fontSize={size}
              className="text-slate-600"
            />
          );
      }
    case 'application':
      switch (type) {
        case 'json':
          return <LucideFileJson2 fontSize={size} className="text-pink-400" />;
        case 'xml':
          return <HugeiconsXml02 className="text-green-400" fontSize={size} />;
        default:
          return (
            <MaterialSymbolsUnknownDocumentOutlineSharp
              fontSize={size}
              className="text-slate-600"
            />
          );
      }
    default:
      return (
        <MaterialSymbolsUnknownDocumentOutlineSharp
          fontSize={size}
          className="text-slate-600"
        />
      );
  }
};
export const MimeTypeIcon: React.FC<FileIconProps> = ({
  mimeType,
  size = 24,
}) => {
  return <InnerMimeTypeIcon mimeType={mimeType} size={size} />;
};

export function MaterialSymbolsUnknownDocumentOutlineSharp(
  props: SVGProps<SVGSVGElement>,
) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="M5 4v16zv5zm2 10h3.675q.275-.55.638-1.062T12.1 12H7zm0 4h3.05q-.05-.5-.05-1t.05-1H7zm-4 4V2h10l6 6v2.3q-.5-.125-1-.213T17 10V9h-5V4H5v16h5.675q.275.575.638 1.075T12.1 22zm14-10q2.075 0 3.538 1.463T22 17t-1.463 3.538T17 22t-3.537-1.463T12 17t1.463-3.537T17 12m0 8q.275 0 .463-.187t.187-.463t-.187-.462T17 18.7t-.462.188t-.188.462t.188.463T17 20m-.45-1.9h.9v-.25q0-.275.15-.488t.35-.412q.35-.3.55-.575t.2-.775q0-.725-.475-1.162T17 14q-.575 0-1.037.338t-.663.912l.8.35q.075-.3.313-.525T17 14.85q.375 0 .588.188t.212.562q0 .275-.15.463t-.35.387q-.15.15-.312.3t-.288.35q-.075.15-.112.3t-.038.35z"
      ></path>
    </svg>
  );
}
export function CarbonModelAlt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 32 32"
      {...props}
    >
      <path
        fill="currentColor"
        d="M28.447 16.106L23 13.381V7a1 1 0 0 0-.553-.894l-6-3a1 1 0 0 0-.894 0l-6 3A1 1 0 0 0 9 7v6.382l-5.447 2.723A1 1 0 0 0 3 17v7a1 1 0 0 0 .553.895l6 3a1 1 0 0 0 .894 0L16 25.118l5.553 2.777a1 1 0 0 0 .894 0l6-3A1 1 0 0 0 29 24v-7a1 1 0 0 0-.553-.895M21 13.381l-4 2v-4.764l4-2Zm-5-8.264L19.764 7L16 8.882L12.236 7Zm-5 3.5l4 2v4.764l-4-2ZM9 25.382l-4-2v-4.764l4 2Zm1-6.5L6.236 17L10 15.118L13.764 17Zm1 1.736l4-2v4.764l-4 2Zm10 4.764l-4-2v-4.764l4 2Zm1-6.5L18.236 17L22 15.118L25.764 17Zm5 4.5l-4 2v-4.764l4-2Z"
      ></path>
    </svg>
  );
}

export function LucideFileJson2(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"></path>
        <path d="M14 2v4a2 2 0 0 0 2 2h4M4 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1a1 1 0 0 1 1 1v1a1 1 0 0 0 1 1m4 0a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1a1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1"></path>
      </g>
    </svg>
  );
}

export function HugeiconsXml02(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        color="currentColor"
      >
        <path d="m7 13l1.647 2.5m0 0l1.647 2.5m-1.647-2.5l1.647-2.5m-1.647 2.5L7 18m14 0h-.823c-.777 0-1.165 0-1.406-.244c-.242-.244-.242-.637-.242-1.423V13m-6.176 5l.342-4.165c.029-.354.043-.53.15-.563s.216.105.435.382l.873 1.104c.119.15.178.225.257.225s.139-.075.257-.225l.874-1.105c.218-.276.328-.415.434-.382c.107.033.122.21.151.563L16.471 18"></path>
        <path d="M15 22h-4.273c-3.26 0-4.892 0-6.024-.798a4.1 4.1 0 0 1-.855-.805C3 19.331 3 17.797 3 14.727v-2.545c0-2.963 0-4.445.469-5.628c.754-1.903 2.348-3.403 4.37-4.113C9.095 2 10.668 2 13.818 2c1.798 0 2.698 0 3.416.252c1.155.406 2.066 1.263 2.497 2.35C20 5.278 20 6.125 20 7.818V10"></path>
        <path d="M3 12a3.333 3.333 0 0 1 3.333-3.333c.666 0 1.451.116 2.098-.057A1.67 1.67 0 0 0 9.61 7.43c.173-.647.057-1.432.057-2.098A3.333 3.333 0 0 1 13 2"></path>
      </g>
    </svg>
  );
}

const mimeType = [
  'application/json',
  'application/xml',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/xml',
  'application/xhtml+xml',
  'application/rss+xml',
  'text/plain',
  'text/html',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'application/octet-stream',
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'video/mp4',
  'video/ogg',
  'video/webm',
  'video/avi',
  'video/mpeg',
  'video/quick',
];

export function DebugMimeTypeIcons() {
  return mimeType.map((item) => <MimeTypeIcon key={item} mimeType={item} />);
}
