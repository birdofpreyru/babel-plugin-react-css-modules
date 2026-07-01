export default {
  additionalProperties: false,
  properties: {
    attributeNames: {
      additionalProperties: false,
      patternProperties: {
        '.*': {
          oneOf: [
            {
              type: 'string',
            },
            {
              type: 'null',
            },
          ],
        },
      },
      type: 'object',
    },
    autoResolveMultipleImports: {
      type: 'boolean',
    },
    context: {
      type: 'string',
    },
    exclude: {
      type: 'string',
    },
    filetypes: {
      additionalProperties: false,
      patternProperties: {
        '\\..*': {
          additionalProperties: false,
          properties: {
            plugins: {
              items: {
                oneOf: [
                  {
                    type: 'string',
                  },
                  {
                    type: 'array',
                  },
                ],
              },
              type: 'array',
            },
            syntax: {
              type: 'string',
            },
          },
          type: 'object',
        },
      },
      type: 'object',
    },
    generateScopedName: {
      oneOf: [
        {
          type: 'string',
        },
        {
          instanceof: 'Function',
        },
      ],
    },
    handleMissingStyleName: {
      enum: ['throw', 'warn', 'ignore'],
    },
    removeImport: {
      type: 'boolean',
    },
    replaceImport: {
      type: 'boolean',
    },
    skip: {
      type: 'boolean',
    },
    transform: {
      instanceof: 'Function',
    },
    webpackHotModuleReloading: {
      oneOf: [{
        type: 'boolean',
      }, {
        enum: ['commonjs'],
      }],
    },
  },
  type: 'object',
};
