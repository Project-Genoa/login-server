import jsdom from 'jsdom'
//import xmldom from '@xmldom/xmldom'
import xpath from 'xpath'

export default class XML {
  static parse(source: any, namespaces: { [prefix: string]: string } = {}): XML | null {
    if (typeof source != 'string') {
      return null
    }
    try {
      return new XML('parse', source, null, namespaces)
    }
    catch (err) {
      if (err instanceof CannotParseError) {
        return null
      }
      else {
        throw err
      }
    }
  }

  static emptyDocument(rootNamespace: string | null, rootName: string, namespaces: { [prefix: string]: string } = {}): XML {
    return new XML('empty', rootName, rootNamespace, namespaces)
  }

  private readonly dom: jsdom.JSDOM
  private readonly document: XMLDocument
  private readonly namespaces: { [prefix: string]: string }
  private readonly nsResolver: XPathNSResolver

  private constructor(type: 'parse', source: string, rootNamespace: null, namespaces: { [prefix: string]: string })
  private constructor(type: 'empty', rootName: string, rootNamespace: string | null, namespaces: { [prefix: string]: string })
  private constructor(type: 'parse' | 'empty', sourceOrRootName: string, rootNamespace: string | null, namespaces: { [prefix: string]: string }) {
    this.dom = new jsdom.JSDOM()

    if (type == 'parse') {
      const document = new this.dom.window.DOMParser().parseFromString(sourceOrRootName, 'text/xml')
      if (document === undefined) {
        throw new CannotParseError()
      }
      this.document = document
    }
    else {
      this.document = this.dom.window.document.implementation.createDocument(rootNamespace != null && rootNamespace in namespaces ? namespaces[rootNamespace] : null, rootNamespace != null && rootNamespace in namespaces ? rootNamespace + ':' + sourceOrRootName : sourceOrRootName)
      /*for (const namespace in namespaces) {
        if (namespace != rootNamespace) {
          (this.document.getRootNode().firstChild as Element).setAttribute('xmlns:' + namespace, namespaces[namespace])
        }
      }*/
    }

    this.namespaces = namespaces // TODO: make deep copy
    this.nsResolver = {
      lookupNamespaceURI: (prefix) => {
        if (prefix != null && prefix in this.namespaces) {
          return this.namespaces[prefix]
        }
        else {
          return null
        }
      },
    }
  }

  toString(): string {
    return new this.dom.window.XMLSerializer().serializeToString(this.document)
  }

  evaluate(path: string, type: 'string'): string
  evaluate(path: string, type: 'number'): number
  evaluate(path: string, type: 'boolean'): boolean
  evaluate(path: string, type: 'node'): Node | null
  evaluate(path: string, type: 'nodeset'): Node[]
  evaluate(path: string, type: 'string' | 'number' | 'boolean' | 'node' | 'nodeset'): string | number | boolean | (Node | null) | Node[] {
    var resultType
    switch (type) {
      case 'string':
        resultType = this.dom.window.XPathResult.STRING_TYPE
        break
      case 'number':
        resultType = this.dom.window.XPathResult.NUMBER_TYPE
        break
      case 'boolean':
        resultType = this.dom.window.XPathResult.BOOLEAN_TYPE
        break
      case 'node':
        resultType = this.dom.window.XPathResult.FIRST_ORDERED_NODE_TYPE
        break
      case 'nodeset':
        resultType = this.dom.window.XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
        break
    }
    const result = xpath.evaluate(path, this.document, this.nsResolver, resultType, null)
    //const result = this.document.evaluate(path, this.document, this.nsResolver, resultType, null)
    switch (type) {
      case 'string':
        return result.stringValue
      case 'number':
        return result.numberValue
      case 'boolean':
        return result.booleanValue
      case 'node':
        return result.singleNodeValue
      case 'nodeset':
        const nodes = []
        for (var index = 0; index < result.snapshotLength; index++) {
          nodes.push(result.snapshotItem(index) as Node)
        }
        return nodes
    }
  }

  createElement(namespace: string | null, name: string, asDefaultNamespace: boolean = false): Element {
    return namespace != null && namespace in this.namespaces ? this.document.createElementNS(this.namespaces[namespace], asDefaultNamespace ? name : namespace + ':' + name) : this.document.createElement(name)
  }

  createText(text: string): Text {
    return this.document.createTextNode(text)
  }

  createAttribute(namespace: string | null, name: string, value: string, asDefaultNamespace: boolean = false): Attr {
    const attribute = namespace != null && namespace in this.namespaces ? this.document.createAttributeNS(this.namespaces[namespace], asDefaultNamespace ? name : namespace + ':' + name) : this.document.createAttribute(name)
    attribute.value = value
    return attribute
  }
}

class CannotParseError extends Error {
  constructor() {
    super('Cannot parse string to XML')
  }
}