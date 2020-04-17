// Source: https://github.com/WebReflection/document-persistent-fragment

const {freeze, setPrototypeOf} = Object
const getText = (node) => node.textContent
const isElement = (node) => node instanceof Element
const isLive = (node) => node.isConnected
const isVisible = (node) => {
  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
    case Node.TEXT_NODE:
    case Node.DOCUMENT_FRAGMENT_NODE:
      return true
  }
  return false
}

function getClone(node) {
  return node.cloneNode(...this)
}

const createNativeFragmentFactory = () => {
  const childNodes = new WeakMap()

  function appendChild(node) {
    removeChild.call(this, node)
    childNodes.get(this).push(node)
  }

  function removeChild(node) {
    const nodes = childNodes.get(this)
    const i = nodes.indexOf(node)
    if (-1 < i) nodes.splice(i, 1)
  }

  class DocumentPersistentFragment {
    constructor() {
      const instance = Reflect.construct(DocumentFragment, [], this.constructor)
      childNodes.set(instance, [])
      return instance
    }
    get children() {
      return childNodes.get(this).filter(isElement)
    }
    get firstElementChild() {
      const {children} = this
      const {length} = children
      return length < 1 ? null : children[0]
    }
    get lastElementChild() {
      const {children} = this
      const {length} = children
      return length < 1 ? null : children[length - 1]
    }
    get childElementCount() {
      return this.children.length
    }
    prepend(...nodes) {
      nodes.forEach(removeChild, this)
      childNodes.get(this).unshift(...nodes)
      return DocumentFragment.prototype.prepend.call(this, ...nodes)
    }
    append(...nodes) {
      nodes.forEach(appendChild, this)
      return DocumentFragment.prototype.append.call(this, ...nodes)
    }
    getElementById(id) {
      return this.querySelector(`#${id}`)
    }
    querySelector(css) {
      return this.isConnected
        ? this.parentNode.querySelector(css)
        : DocumentFragment.prototype.querySelector.call(this, css)
    }
    querySelectorAll(css) {
      return this.isConnected
        ? this.parentNode.querySelectorAll(css)
        : DocumentFragment.prototype.querySelectorAll.call(this, css)
    }
    get nodeName() {
      return '#document-persistent-fragment'
    }
    get isConnected() {
      return childNodes.get(this).some(isLive)
    }
    get parentNode() {
      const node = childNodes.get(this).find(isLive)
      return node.parentNode
    }
    get parentElement() {
      return this.parentNode
    }
    get childNodes() {
      return freeze(childNodes.get(this).slice(0))
    }
    get firstChild() {
      const nodes = childNodes.get(this)
      const {length} = nodes
      return length < 1 ? null : nodes[0]
    }
    get lastChild() {
      const nodes = childNodes.get(this)
      const {length} = nodes
      return length < 1 ? null : nodes[length - 1]
    }
    get previousSibling() {
      const {firstChild} = this
      return firstChild && firstChild.previousSibling
    }
    get nextSibling() {
      const {lastChild} = this
      return lastChild && lastChild.nextSibling
    }
    get textContent() {
      return childNodes.get(this).filter(isVisible).map(getText).join('')
    }
    hasChildNodes() {
      return 0 < childNodes.get(this).length
    }
    cloneNode(...args) {
      const pf = new DocumentPersistentFragment()
      pf.append(...childNodes.get(this).map(getClone, args))
      return pf
    }
    compareDocumentPosition(node) {
      const {firstChild} = this
      return firstChild
        ? firstChild.compareDocumentPosition(node)
        : DocumentFragment.prototype.compareDocumentPosition.call(this, node)
    }
    contains(node) {
      return childNodes.get(this).indexOf(node) > -1
    }
    insertBefore(before, node) {
      const nodes = childNodes.get(this)
      const i = nodes.indexOf(node)
      if (-1 < i) nodes.splice(i, 0, before)
      return DocumentFragment.prototype.insertBefore.call(this, before, node)
    }
    appendChild(node) {
      if (this.isConnected) this.parentNode.insertBefore(node, this.nextSibling)
      else DocumentFragment.prototype.appendChild.call(this, node)
      appendChild.call(this, node)
      return node
    }
    replaceChild(replace, node) {
      const nodes = childNodes.get(this)
      const i = nodes.indexOf(node)
      if (-1 < i) nodes[i] = replace
      return this.isConnected
        ? this.parentNode.replaceChild(replace, node)
        : DocumentFragment.prototype.replaceChild.call(this, replace, node)
    }
    removeChild(node) {
      removeChild.call(this, node)
      return this.isConnected
        ? this.parentNode.removeChild(node)
        : DocumentFragment.prototype.removeChild.call(this, node)
    }
    remove() {
      this.append(...childNodes.get(this))
    }
    valueOf() {
      this.remove()
      return this
    }
  }
  return () => new DocumentPersistentFragment()
}

const createOldBrowserFragmentFactory = () => {
  const hasConnected = 'isConnected' in Node.prototype
  if (!hasConnected)
    Object.defineProperty(Node.prototype, 'isConnected', {
      get() {
        return (
          !this.ownerDocument ||
          !(
            this.ownerDocument.compareDocumentPosition(this) &
            this.DOCUMENT_POSITION_DISCONNECTED
          )
        )
      }
    })
  return () => {
    const childNodes = []
    function appendChild(node) {
      removeChild(node)
      childNodes.push(node)
    }
    function removeChild(node) {
      const nodes = childNodes
      const i = nodes.indexOf(node)
      if (-1 < i) nodes.splice(i, 1)
    }
    return Object.defineProperties(document.createDocumentFragment(), {
      children: {
        get() {
          return childNodes.filter(isElement)
        }
      },
      firstElementChild: {
        get() {
          const {children} = this
          const {length} = children
          return length < 1 ? null : children[0]
        }
      },
      lastElementChild: {
        get() {
          const {children} = this
          const {length} = children
          return length < 1 ? null : children[length - 1]
        }
      },
      childElementCount: {
        get() {
          return this.children.length
        }
      },
      prepend: {
        value(...nodes) {
          nodes.forEach(removeChild)
          childNodes.unshift(...nodes)
          return DocumentFragment.prototype.prepend.call(this, ...nodes)
        }
      },
      append: {
        value(...nodes) {
          nodes.forEach(appendChild)
          return DocumentFragment.prototype.append.call(this, ...nodes)
        }
      },
      getElementById: {
        value(id) {
          return this.querySelector(`#${id}`)
        }
      },
      querySelector: {
        value(css) {
          return this.isConnected
            ? this.parentNode.querySelector(css)
            : DocumentFragment.prototype.querySelector.call(this, css)
        }
      },
      querySelectorAll: {
        value(css) {
          return this.isConnected
            ? this.parentNode.querySelectorAll(css)
            : DocumentFragment.prototype.querySelector.call(this, css)
        }
      },
      isConnected: {
        get() {
          return childNodes.some(isLive)
        }
      },
      parentNode: {
        get() {
          const node = childNodes.find(isLive)
          return node.parentNode
        }
      },
      parentElement: {
        get() {
          return this.parentNode
        }
      },
      childNodes: {
        get() {
          return childNodes.slice(0)
        }
      },
      firstChild: {
        get() {
          const nodes = childNodes
          const {length} = nodes
          return length < 1 ? null : nodes[0]
        }
      },
      lastChild: {
        get() {
          const nodes = childNodes
          const {length} = nodes
          return length < 1 ? null : nodes[length - 1]
        }
      },
      previousSibling: {
        get() {
          const {firstChild} = this
          return firstChild && firstChild.previousSibling
        }
      },
      nextSibling: {
        get() {
          const {lastChild} = this
          return lastChild && lastChild.nextSibling
        }
      },
      textContent: {
        get() {
          return childNodes.filter(isVisible).map(getText).join('')
        }
      },
      hasChildNodes: {
        value() {
          return 0 < childNodes.length
        }
      },
      cloneNode: {
        value(...args) {
          const pf = createPersistentFragment()
          pf.append(...childNodes.map(getClone, args))
          return pf
        }
      },
      compareDocumentPosition: {
        value(node) {
          const {firstChild} = this
          return firstChild
            ? firstChild.compareDocumentPosition(node)
            : DocumentFragment.prototype.compareDocumentPosition.call(
                this,
                node
              )
        }
      },
      contains: {
        value(node) {
          return childNodes.indexOf(node) > -1
        }
      },
      insertBefore: {
        value(before, node) {
          const nodes = childNodes
          const i = nodes.indexOf(node)
          if (-1 < i) nodes.splice(i, 0, before)
          return DocumentFragment.prototype.insertBefore.call(
            this,
            before,
            node
          )
        }
      },
      appendChild: {
        value(node) {
          if (this.isConnected)
            this.parentNode.insertBefore(node, this.nextSibling)
          else DocumentFragment.prototype.appendChild.call(this, node)
          appendChild(node)
          return node
        }
      },
      replaceChild: {
        value(replace, node) {
          const nodes = childNodes
          const i = nodes.indexOf(node)
          if (-1 < i) nodes[i] = replace
          return this.isConnected
            ? this.parentNode.replaceChild(replace, node)
            : DocumentFragment.prototype.replaceChild.call(this, replace, node)
        }
      },
      removeChild: {
        value(node) {
          removeChild(node)
          return this.isConnected
            ? this.parentNode.removeChild(node)
            : DocumentFragment.prototype.removeChild.call(this, node)
        }
      },
      remove: {
        value() {
          this.append(...childNodes)
        }
      },
      valueOf: {
        value() {
          this.remove()
          return this
        }
      }
    })
  }
}

const isIE11 = 'msMaxTouchPoints' in navigator

export const createPersistentFragment = isIE11
  ? createOldBrowserFragmentFactory()
  : createNativeFragmentFactory()
