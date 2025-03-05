import globrex from 'globrex';
import RandExp from 'randexp';
import React, { useMemo } from 'react';

interface IExampleUrlProps {
  url: string;
  type: 'glob' | 'regex';
}

export const getRegexByType = (type: 'glob' | 'regex', pattern?: string) => {
  if (!pattern) {
    return;
  }
  if (type === 'glob') {
    return globrex(pattern, { extended: true }).regex;
  } else {
    return new RegExp(pattern);
  }
};

export const ExampleUrl: React.FC<IExampleUrlProps> = ({ url, type }) => {
  const exampleUrl = useMemo(() => {
    try {
      if (!url) return '';
      const regexUrl = getRegexByType(type, url);
      if (!regexUrl) {
        return '';
      }

      const randExp = new RandExp(regexUrl);
      randExp.max = 10;
      // Set valid URL characters range
      randExp.defaultRange.subtract(32, 47); // Remove special chars
      randExp.defaultRange.subtract(58, 64); // Remove special chars
      randExp.defaultRange.subtract(91, 96); // Remove special chars
      randExp.defaultRange.subtract(123, 126); // Remove special chars
      randExp.defaultRange.add(45); // Allow hyphen
      randExp.defaultRange.add(46); // Allow dot
      randExp.defaultRange.add(95); // Allow underscore
      randExp.defaultRange.add(47); // Allow forward slash
      const randUrl = randExp.gen();
      return randUrl;
    } catch (e: unknown) {
      return <span className="text-red-500">{(e as Error).message}</span>;
    }
  }, [type, url]);
  return (
    <div className="my-2">
      <div>Example:</div>
      <code>{exampleUrl}</code>
    </div>
  );
};
