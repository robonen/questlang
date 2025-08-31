import antfu from '@antfu/eslint-config';

export default antfu(
  {
    stylistic: {
      indent: 2,
      semi: true,
      quotes: 'single',
      overrides: {
        'style/comma-dangle': ['error', 'always-multiline'],
      },
    },
    typescript: true,
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': 'error',
    }
  },
);