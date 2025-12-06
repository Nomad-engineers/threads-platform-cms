interface Array<T> {
  first: T
}

Array.prototype.first = function () {
  return this[0]
}
