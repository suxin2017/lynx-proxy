import { filterMimeType, filterUri } from '@/store/requestTableStore';
import { Input, Select } from 'antd';
import React from 'react';
import { useDispatch } from 'react-redux';

interface IFilterProps {}

export const TableFilter: React.FC<IFilterProps> = () => {
  const dispatch = useDispatch();

  return (
    <div className="m-1 flex h-8 gap-2">
      <div className="flex items-center gap-1">
        <div className="text-sm">Filter:</div>
        <Input
          allowClear
          placeholder="example.com"
          onChange={(e) => {
            dispatch(filterUri(e.target.value));
          }}
        />
      </div>
      <div className="flex items-center gap-1">
        <div className="text-sm whitespace-pre">Mime Type:</div>
        <Select
          className="min-w-36 flex-1"
          placeholder="application/json"
          mode="multiple"
          onChange={(value: string[]) => {
            dispatch(filterMimeType(value));
          }}
          maxTagCount="responsive"
          allowClear
          options={[
            {
              label: 'application',
              options: [
                { label: 'application', value: 'application' },
                { label: 'application/json', value: 'application/json' },
                { label: 'application/xml', value: 'application/xml' },
                {
                  label: 'application/x-www-form-urlencoded',
                  value: 'application/x-www-form-urlencoded',
                },
                {
                  label: 'application/javascript',
                  value: 'application/javascript',
                },
                { label: 'application/pdf', value: 'application/pdf' },
                { label: 'application/zip', value: 'application/zip' },
                {
                  label: 'application/octet-stream',
                  value: 'application/octet-stream',
                },
              ],
            },
            {
              label: 'text',
              options: [
                { label: 'text', value: 'text' },
                { label: 'text/plain', value: 'text/plain' },
                { label: 'text/html', value: 'text/html' },
                { label: 'text/css', value: 'text/css' },
                { label: 'text/csv', value: 'text/csv' },
                { label: 'text/javascript', value: 'text/javascript' },
              ],
            },
            {
              label: 'image',
              options: [
                { label: 'image', value: 'image' },
                { label: 'image/jpeg', value: 'image/jpeg' },
                { label: 'image/png', value: 'image/png' },
                { label: 'image/gif', value: 'image/gif' },
                { label: 'image/svg+xml', value: 'image/svg+xml' },
                { label: 'image/webp', value: 'image/webp' },
              ],
            },
            {
              label: 'audio',
              options: [
                { label: 'audio', value: 'audio' },
                { label: 'audio/mpeg', value: 'audio/mpeg' },
                { label: 'audio/ogg', value: 'audio/ogg' },
              ],
            },
            {
              label: 'video',
              options: [
                { label: 'video', value: 'video' },
                { label: 'video/mp4', value: 'video/mp4' },
                { label: 'video/webm', value: 'video/webm' },
              ],
            },
            {
              label: 'multipart',
              options: [
                { label: 'multipart', value: 'multipart' },
                {
                  label: 'multipart/form-data',
                  value: 'multipart/form-data',
                },
              ],
            },
          ]}
        />
      </div>
    </div>
  );
};
