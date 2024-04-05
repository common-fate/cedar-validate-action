import { Schema } from '@common-fate/cedar-node'
import { describe, it } from '@jest/globals'
import { ValidateOutput, validatePolicySet } from './validate'

const exampleSchema: Schema = {
  '': {
    actions: {
      View: {
        appliesTo: {
          principalTypes: ['User'],
          resourceTypes: ['Document']
        }
      }
    },
    entityTypes: {
      User: {
        shape: {
          type: 'Record',
          attributes: {
            name: {
              type: 'String'
            }
          }
        }
      },
      Document: {
        shape: {
          type: 'Record',
          attributes: {}
        }
      }
    }
  }
}

describe('validatePolicySet', () => {
  it('validates a policy correctly', async () => {
    const result = validatePolicySet({
      policySet: `permit(principal,action,resource);`,
      schema: exampleSchema
    })

    const want: ValidateOutput = {
      schemaErrors: [],
      validationErrors: [],
      validationWarnings: []
    }

    expect(result).toStrictEqual(want)
  })

  it('returns an error for an invalid policy', async () => {
    const result = validatePolicySet({
      policySet: `permit(principal,action == Action::"Invalid",resource);`,
      schema: exampleSchema
    })

    const want: ValidateOutput = {
      schemaErrors: [],
      validationErrors: [
        {
          error: 'unrecognized action `Action::"Invalid"`',
          policyId: 'policy0',
          sourceLocation: {
            start: {
              line: 1,
              col: 1
            },
            end: {
              line: 1,
              col: 56
            }
          }
        },

        {
          error:
            'unable to find an applicable action given the policy head constraints',
          policyId: 'policy0',
          sourceLocation: {
            start: {
              line: 1,
              col: 1
            },
            end: {
              line: 1,
              col: 56
            }
          }
        }
      ],
      validationWarnings: [
        {
          warning:
            'policy is impossible: the policy expression evaluates to false for all valid requests',
          policyId: 'policy0',
          sourceLocation: {
            start: {
              line: 1,
              col: 1
            },
            end: {
              line: 1,
              col: 56
            }
          }
        }
      ]
    }

    expect(result).toStrictEqual(want)
  })
})
