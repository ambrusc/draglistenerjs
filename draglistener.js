/* jshint strict: true */
/* jshint browser: true */

// Copyright (c) 2016 Ambrus Csaszar

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.


(function() {
  "use strict";


  // Mouse Buttons -------------------------------------------------------------

  var BUTTONS = {
    left: 1,
    right: 2,
    middle: 4,
    back: 8,
    forward: 16,
  };

  var BUTTON_NAMES = {};
  for (var key in BUTTONS) {
    if (BUTTONS.hasOwnProperty(key)) {
      BUTTON_NAMES[BUTTONS[key]] = key;
    }
  }

  function getButtonNames(buttons) {
    var names = [];
    for (var value in BUTTON_NAMES) {
      if (BUTTON_NAMES.hasOwnProperty(value) && (value & buttons)) {
        names.push(BUTTON_NAMES[value]);
      }
    }
    return names;
  }

  function getButtonsChanged(buttons, lastButtons) {
    return (buttons & ~lastButtons) | (lastButtons & ~buttons);
  }


  // Event Listeners -----------------------------------------------------------

  function addListener(target, type, listener, useCapture) {
    target.addEventListener(type, listener, useCapture);
    return [target, type, listener, useCapture];
  }

  function removeListener(target, type, listener, useCapture) {
    target.removeEventListener(type, listener, useCapture);
    return [target, type, listener, useCapture];
  }

  function clearListeners(listenerList) {
    listenerList.forEach(function(listenerArgs) {
      removeListener.apply(removeListener, listenerArgs);
    });
    listenerList.splice(0, listenerList.length);
  }


  // Drag Listener Class -------------------------------------------------------

  function DragListener(container, onDrag) {
    this.container = container;
    this.onDrag = onDrag;

    this.mouseListeners = [];
    this.contextListeners = [];
    this.blockContextMenuMs = 100;
    this.lastRightMouseUpTime = 0;
    this.lastButtons = 0;
    this.lastClientX = 0;
    this.lastClientY = 0;

    this.enable();
  }

  // Start responding to events.
  DragListener.prototype.enable = function() {
    if (!this.mouseListeners.length) {
      this._registerIdleEvents();
    }
    if (!this.contextListeners.length) {
      this.contextListeners.push(
          addListener(window, "contextmenu", this._onContextMenu.bind(this)),
          true);
    }
  };

  // Stop responding to events.
  DragListener.prototype.disable = function() {
    clearListeners(this.mouseListeners);
    clearListeners(this.contextListeners);
  };


  // [Private API] -------------------------------------------------------------

  // Listen for mouse down when the user isn't dragging.
  DragListener.prototype._registerIdleEvents = function() {
    this.mouseListeners.push(
        addListener(this.container, "mousedown", this._onMouseDown.bind(this)));
  };

  // Listen for events during dragging of any button.
  DragListener.prototype._registerDragEvents = function(target) {
    this.mouseListeners.push(
        addListener(target, "mousedown", this._onMouseDown.bind(this)));
    this.mouseListeners.push(
        addListener(target, "mousemove", this._onMouseMove.bind(this)));
    this.mouseListeners.push(
        addListener(target, "mouseup", this._onMouseUp.bind(this)));
  };

  // Listen for context menu to block its appearance shortly after right-button
  // release.
  DragListener.prototype._onContextMenu = function(event) {
    var time = +new Date();
    if (time - this.lastRightMouseUpTime < this.blockContextMenuMs) {
      event.preventDefault();
    }
  };

  // Listen for mouse down to start a drag.
  DragListener.prototype._onMouseDown = function(event) {
    clearListeners(this.mouseListeners);
    if (this.container.setCapture) {
      this.container.setCapture();
      this._registerDragEvents(this.container);
    } else {
      this._registerDragEvents(window);
    }
    var rect = this.container.getBoundingClientRect();
    this.lastClientX = event.clientX - rect.left;
    this.lastClientY = event.clientY - rect.top;
    this.lastButtons = event.buttons;
  };

  // Listen for mouse move during dragging.
  DragListener.prototype._onMouseMove = function(event) {
    // NOTE(ambrus): It appears we don't get mouseUp events when multiple
    // buttons are pressed at the same time and then released. The best we can do is listen for
    // the first move event in the window with no buttons.
    if (!event.buttons) {
      this._onMouseUp(event);
    } else {
      if (this.onDrag) {
        var rect = this.container.getBoundingClientRect();
        var clientX = event.clientX - rect.left;
        var clientY = event.clientY - rect.top;
        this.onDrag({
          button: event.button,
          buttons: event.buttons,

          screenX: event.screenX,
          screenY: event.screenY,
          clientX: clientX,
          clientY: clientY,
          dx: clientX - this.lastClientX,
          dy: clientY - this.lastClientY,

          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey,

          relatedTarget: event.relatedTarget,
          region: event.region,
        });
        this.lastClientX = clientX;
        this.lastClientY = clientY;
      }
      this.lastButtons = event.buttons;
    }
  };

  // Listen for mouse up to finish dragging.
  DragListener.prototype._onMouseUp = function(event) {
    var buttonsChanged = getButtonsChanged(event.buttons, this.lastButtons);

    if (buttonsChanged & BUTTONS.right) {
      this.lastRightMouseUpTime = +new Date();
    }

    if (!event.buttons) {
      if (document.releaseCapture) {
        document.releaseCapture();
      }
      clearListeners(this.mouseListeners);
      this._registerIdleEvents();
    }

    this.lastButtons = event.buttons;
  };

  window.dragListener = {
    DragListener: DragListener,

    BUTTONS: BUTTONS,
    BUTTON_NAMES: BUTTON_NAMES,
    getButtonNames: getButtonNames,
    getButtonsChanged: getButtonsChanged,

    addListener: addListener,
    removeListener: removeListener,
    clearListeners: clearListeners,
  };
}());
