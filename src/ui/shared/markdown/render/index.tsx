/* eslint-disable */

import memoize from 'memoizee'
import * as R from 'ramda'
import * as React from 'react'
import baseRules from '../render/ast'
import { Code, Highlighter, Link } from '../render/elements'
import {
  astToString,
  flattenAst,
  recurse
} from './util'
import SimpleMarkdown from 'simple-markdown'

function parserFor(rules, returnAst?) {
  const parser = SimpleMarkdown.parserFor(rules)
  const renderer = SimpleMarkdown.reactFor(
    SimpleMarkdown.ruleOutput(rules, 'react')
  )
  return memoize(
    (input = '', inline = true, state = {}, transform = null) => {
      if (!inline) {
        input += '\n\n'
      }

      const parse = R.pipe.apply(
        this,
        [parser, flattenAst, transform, !returnAst && renderer].filter(Boolean)
      )

      return parse(input, { inline, ...state })
    },
    {
      normalizer: (...args) => JSON.stringify(args)
    }
  )
}

function createRules(rule: { [key: string]: any }) {
  const { paragraph, url, link, codeBlock, inlineCode } = rule

  return {
    ...rule,
    s: {
      order: rule.u.order,
      match: SimpleMarkdown.inlineRegex(/^~~([\s\S]+?)~~(?!_)/),
      parse: rule.u.parse,
      react: (node, recurseOutput, state) => (
        <s key={state.key}>{recurseOutput(node.content, state)}</s>
      )
    },
    paragraph: {
      ...paragraph,
      react: (node, recurseOutput, state) => (
        <p key={state.key}>{recurseOutput(node.content, state)}</p>
      )
    },
    url: {
      ...url,
      match: SimpleMarkdown.inlineRegex(
        /^((https?|steam):\/\/[^\s<]+[^<.,:;"')\]\s])/
      )
    },
    link: {
      ...link,
      react: (node, recurseOutput, state) => (
        <Link
          title={node.title || astToString(node.content)}
          href={SimpleMarkdown.sanitizeUrl(node.target)}
          target="_blank"
          rel="noreferrer"
          key={state.key}
        >
          {recurseOutput(node.content, state)}
        </Link>
      )
    },
    inlineCode: {
      ...inlineCode,
      react: (node, recurseOutput, state) => (
        <Code inline={true} className="inline" key={state.key}>
          {recurse(node, recurseOutput, state)}
        </Code>
      )
    },
    codeBlock: {
      ...codeBlock,
      react: (node, recurseOutput, state) => (
        <Highlighter key={state.key} language={node.lang}>
          {recurse(node, recurseOutput, state)}
        </Highlighter>
      )
    }
  }
}

const rulesWithoutMaskedLinks = createRules({
  ...baseRules,
  link: {
    ...baseRules.link,
    match: () => null
  }
})
const parse = parserFor(rulesWithoutMaskedLinks)

export const parseAllowLinks = parserFor(createRules(baseRules))
export const parseEmbedTitle = parserFor(
  R.omit(
    ['codeBlock', 'br', 'mention', 'channel', 'roleMention'],
    rulesWithoutMaskedLinks
  )
)

function Markdown({ children }: { children: string }) {
  return children ? parse(children) : null
}

export class MarkdownC {
  public static withComponent = Component => ({ children, ...props }) => (
    <Component {...props}>
      <Markdown>{children}</Markdown>
    </Component>
  )
}

export default Markdown