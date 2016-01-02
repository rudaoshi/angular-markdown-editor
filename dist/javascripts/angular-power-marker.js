/*
Concatinated JS file 
Author: Mingming Sun 
Created Date: 2016-01-03
 */ 
/* ===================================================
 * bootstrap-markdown.js v2.9.0
 * http://github.com/toopay/bootstrap-markdown
 * ===================================================
 * Copyright 2013-2015 Taufan Aditya
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */

!function ($) {

    "use strict"; // jshint ;_;

    /* MARKDOWN CLASS DEFINITION
     * ========================== */

    var Markdown = function (element, options) {
        // @TODO : remove this BC on next major release
        // @see : https://github.com/toopay/bootstrap-markdown/issues/109
        var opts = ['autofocus', 'savable', 'hideable', 'width',
            'height', 'resize', 'iconlibrary', 'language',
            'footer', 'fullscreen', 'hiddenButtons', 'disabledButtons',
            'previewonly'
        ];
        $.each(opts, function (_, opt) {
            if (typeof $(element).data(opt) !== 'undefined') {
                options = typeof options == 'object' ? options : {}
                options[opt] = $(element).data(opt)
            }
        });
        // End BC

        // Class Properties
        this.$ns = 'bootstrap-markdown';
        this.$element = $(element);
        this.$editable = {el: null, type: null, attrKeys: [], attrValues: [], content: null};
        this.$options = $.extend(true, {}, $.fn.markdown.defaults, options, this.$element.data('options'));
        this.$oldContent = null;
        this.$isPreview = false;
        this.$isFullscreen = false;
        this.$editor = null;
        this.$textarea = null;
        this.$previewarea = null;
        this.$handler = [];
        this.$callback = [];
        this.$nextTab = [];

        this.showEditor();

    };

    Markdown.prototype = {

        constructor: Markdown

        , __alterButtons: function (name, alter) {
            var handler = this.$handler, isAll = (name == 'all'), that = this;

            $.each(handler, function (k, v) {
                var halt = true;
                if (isAll) {
                    halt = false;
                } else {
                    halt = v.indexOf(name) < 0;
                }

                if (halt === false) {
                    alter(that.$editor.find('button[data-handler="' + v + '"]'));
                }
            });
        }

        , __buildButtons: function (buttonsArray, container) {
            var i,
                ns = this.$ns,
                handler = this.$handler,
                callback = this.$callback;

            for (i = 0; i < buttonsArray.length; i++) {
                // Build each group container
                var y, btnGroups = buttonsArray[i];
                for (y = 0; y < btnGroups.length; y++) {
                    // Build each button group
                    var z,
                        buttons = btnGroups[y].data,
                        btnGroupContainer = $('<div/>', {
                            'class': 'btn-group'
                        });

                    for (z = 0; z < buttons.length; z++) {
                        var button = buttons[z],
                            buttonContainer, buttonIconContainer,
                            buttonHandler = ns + '-' + button.name,
                            buttonIcon = this.__getIcon(button.icon),
                            btnText = button.btnText ? button.btnText : '',
                            btnClass = button.btnClass ? button.btnClass : 'btn',
                            tabIndex = button.tabIndex ? button.tabIndex : '-1',
                            hotkey = typeof button.hotkey !== 'undefined' ? button.hotkey : '',
                            hotkeyCaption = typeof jQuery.hotkeys !== 'undefined' && hotkey !== '' ? ' (' + hotkey + ')' : '';

                        // Construct the button object
                        buttonContainer = $('<button></button>');
                        buttonContainer.text(' ' + this.__localize(btnText)).addClass('btn-default btn-sm').addClass(btnClass);
                        if (btnClass.match(/btn\-(primary|success|info|warning|danger|link)/)) {
                            buttonContainer.removeClass('btn-default');
                        }
                        buttonContainer.attr({
                            'type': 'button',
                            'title': this.__localize(button.title) + hotkeyCaption,
                            'tabindex': tabIndex,
                            'data-provider': ns,
                            'data-handler': buttonHandler,
                            'data-hotkey': hotkey
                        });
                        if (button.toggle === true) {
                            buttonContainer.attr('data-toggle', 'button');
                        }
                        buttonIconContainer = $('<span/>');
                        buttonIconContainer.addClass(buttonIcon);
                        buttonIconContainer.prependTo(buttonContainer);

                        // Attach the button object
                        btnGroupContainer.append(buttonContainer);

                        // Register handler and callback
                        handler.push(buttonHandler);
                        callback.push(button.callback);
                    }

                    // Attach the button group into container dom
                    container.append(btnGroupContainer);
                }
            }

            return container;
        }
        , __setListener: function () {
            // Set size and resizable Properties
            var hasRows = typeof this.$textarea.attr('rows') !== 'undefined',
                maxRows = this.$textarea.val().split("\n").length > 5 ? this.$textarea.val().split("\n").length : '5',
                rowsVal = hasRows ? this.$textarea.attr('rows') : maxRows;

            this.$textarea.attr('rows', rowsVal);
            if (this.$options.resize) {
                this.$textarea.css('resize', this.$options.resize);
            }

            this.$textarea
                .on('focus', $.proxy(this.focus, this))
                .on('keypress', $.proxy(this.keypress, this))
                .on('keyup', $.proxy(this.keyup, this))
                .on('change', $.proxy(this.change, this))
                .on('select', $.proxy(this.select, this));

            if (this.eventSupported('keydown')) {
                this.$textarea.on('keydown', $.proxy(this.keydown, this));
            }

            // Re-attach markdown data
            this.$textarea.data('markdown', this);
        }

        , __handle: function (e) {
            var target = $(e.currentTarget),
                handler = this.$handler,
                callback = this.$callback,
                handlerName = target.attr('data-handler'),
                callbackIndex = handler.indexOf(handlerName),
                callbackHandler = callback[callbackIndex];

            // Trigger the focusin
            $(e.currentTarget).focus();

            callbackHandler(this);

            // Trigger onChange for each button handle
            this.change(this);

            // Unless it was the save handler,
            // focusin the textarea
            if (handlerName.indexOf('cmdSave') < 0) {
                this.$textarea.focus();
            }

            e.preventDefault();
        }

        , __localize: function (string) {
            var messages = $.fn.markdown.messages,
                language = this.$options.language;
            if (
                typeof messages !== 'undefined' &&
                typeof messages[language] !== 'undefined' &&
                typeof messages[language][string] !== 'undefined'
            ) {
                return messages[language][string];
            }
            return string;
        }

        , __getIcon: function (src) {
            return typeof src == 'object' ? src[this.$options.iconlibrary] : src;
        }

        , setFullscreen: function (mode) {
            var $editor = this.$editor,
                $textarea = this.$textarea;

            if (mode === true) {
                $editor.addClass('md-fullscreen-mode');
                $('body').addClass('md-nooverflow');
                this.$options.onFullscreen(this);
            } else {
                $editor.removeClass('md-fullscreen-mode');
                $('body').removeClass('md-nooverflow');

                if (this.$isPreview == true) this.hidePreview().showPreview()
            }

            this.$isFullscreen = mode;
            $textarea.focus();
        }

        , showEditor: function () {
            var instance = this,
                textarea,
                ns = this.$ns,
                container = this.$element,
                originalHeigth = container.css('height'),
                originalWidth = container.css('width'),
                editable = this.$editable,
                handler = this.$handler,
                callback = this.$callback,
                options = this.$options,
                editor = $('<div/>', {
                    'class': 'md-editor',
                    click: function () {
                        instance.focus();
                    }
                });

            // Prepare the editor
            if (this.$editor === null) {
                // Create the panel
                var editorHeader = $('<div/>', {
                    'class': 'md-header btn-toolbar'
                });

                // Merge the main & additional button groups together
                var allBtnGroups = [];
                if (options.buttons.length > 0) allBtnGroups = allBtnGroups.concat(options.buttons[0]);
                if (options.additionalButtons.length > 0) {
                    // iterate the additional button groups
                    $.each(options.additionalButtons[0], function (idx, buttonGroup) {

                        // see if the group name of the addional group matches an existing group
                        var matchingGroups = $.grep(allBtnGroups, function (allButtonGroup, allIdx) {
                            return allButtonGroup.name === buttonGroup.name;
                        });

                        // if it matches add the addional buttons to that group, if not just add it to the all buttons group
                        if (matchingGroups.length > 0) {
                            matchingGroups[0].data = matchingGroups[0].data.concat(buttonGroup.data);
                        } else {
                            allBtnGroups.push(options.additionalButtons[0][idx]);
                        }

                    });
                }

                // Reduce and/or reorder the button groups
                if (options.reorderButtonGroups.length > 0) {
                    allBtnGroups = allBtnGroups
                        .filter(function (btnGroup) {
                            return options.reorderButtonGroups.indexOf(btnGroup.name) > -1;
                        })
                        .sort(function (a, b) {
                            if (options.reorderButtonGroups.indexOf(a.name) < options.reorderButtonGroups.indexOf(b.name)) return -1;
                            if (options.reorderButtonGroups.indexOf(a.name) > options.reorderButtonGroups.indexOf(b.name)) return 1;
                            return 0;
                        });
                }

                // Build the buttons
                if (allBtnGroups.length > 0) {
                    editorHeader = this.__buildButtons([allBtnGroups], editorHeader);
                }

                if (options.fullscreen.enable) {
                    editorHeader.append('<div class="md-controls"><a class="md-control md-control-fullscreen" href="#"><span class="' + this.__getIcon(options.fullscreen.icons.fullscreenOn) + '"></span></a></div>').on('click', '.md-control-fullscreen', function (e) {
                        e.preventDefault();
                        instance.setFullscreen(true);
                    });
                }

                editor.append(editorHeader);

                // Wrap the textarea
                if (container.is('textarea')) {
                    container.before(editor);
                    textarea = container;
                    textarea.addClass('md-input');
                    editor.append(textarea);
                } else {
                    var rawContent = (typeof toMarkdown == 'function') ? toMarkdown(container.html()) : container.html(),
                        currentContent = $.trim(rawContent);

                    // This is some arbitrary content that could be edited
                    textarea = $('<textarea/>', {
                        'class': 'md-input',
                        'val': currentContent
                    });

                    editor.append(textarea);

                    // Save the editable
                    editable.el = container;
                    editable.type = container.prop('tagName').toLowerCase();
                    editable.content = container.html();

                    $(container[0].attributes).each(function () {
                        editable.attrKeys.push(this.nodeName);
                        editable.attrValues.push(this.nodeValue);
                    });

                    // Set editor to blocked the original container
                    container.replaceWith(editor);
                }

                var editorFooter = $('<div/>', {
                        'class': 'md-footer'
                    }),
                    createFooter = false,
                    footer = '';
                // Create the footer if savable
                if (options.savable) {
                    createFooter = true;
                    var saveHandler = 'cmdSave';

                    // Register handler and callback
                    handler.push(saveHandler);
                    callback.push(options.onSave);

                    editorFooter.append('<button class="btn btn-success" data-provider="'
                        + ns
                        + '" data-handler="'
                        + saveHandler
                        + '"><i class="icon icon-white icon-ok"></i> '
                        + this.__localize('Save')
                        + '</button>');


                }

                footer = typeof options.footer === 'function' ? options.footer(this) : options.footer;

                if ($.trim(footer) !== '') {
                    createFooter = true;
                    editorFooter.append(footer);
                }

                if (createFooter) editor.append(editorFooter);

                // Set width
                if (options.width && options.width !== 'inherit') {
                    if (jQuery.isNumeric(options.width)) {
                        editor.css('display', 'table');
                        textarea.css('width', options.width + 'px');
                    } else {
                        editor.addClass(options.width);
                    }
                }

                // Set height
                if (options.height && options.height !== 'inherit') {
                    if (jQuery.isNumeric(options.height)) {
                        var height = options.height;
                        if (editorHeader) height = Math.max(0, height - editorHeader.outerHeight());
                        if (editorFooter) height = Math.max(0, height - editorFooter.outerHeight());
                        textarea.css('height', height + 'px');
                    } else {
                        editor.addClass(options.height);
                    }
                }

                // Reference
                this.$editor = editor;
                this.$textarea = textarea;
                this.$editable = editable;
                this.$oldContent = this.getContent();

                this.__setListener();

                // Set editor attributes, data short-hand API and listener
                this.$editor.attr('id', (new Date()).getTime());
                this.$editor.on('click', '[data-provider="bootstrap-markdown"]', $.proxy(this.__handle, this));

                if (this.$element.is(':disabled') || this.$element.is('[readonly]')) {
                    this.$editor.addClass('md-editor-disabled');
                    this.disableButtons('all');
                }

                if (this.eventSupported('keydown') && typeof jQuery.hotkeys === 'object') {
                    editorHeader.find('[data-provider="bootstrap-markdown"]').each(function () {
                        var $button = $(this),
                            hotkey = $button.attr('data-hotkey');
                        if (hotkey.toLowerCase() !== '') {
                            textarea.bind('keydown', hotkey, function () {
                                $button.trigger('click');
                                return false;
                            });
                        }
                    });
                }

                if (options.initialstate === 'preview') {
                    this.showPreview();
                } else if (options.initialstate === 'fullscreen' && options.fullscreen.enable) {
                    this.setFullscreen(true);
                }

            } else {
                this.$editor.show();
            }

            if (options.autofocus) {
                this.$textarea.focus();
                this.$editor.addClass('active');
            }

            if (options.fullscreen.enable && options.fullscreen !== false) {
                this.$editor.append('<div class="md-fullscreen-controls">'
                    + '<a href="#" class="exit-fullscreen" title="Exit fullscreen"><span class="' + this.__getIcon(options.fullscreen.icons.fullscreenOff) + '">'
                    + '</span></a>'
                    + '</div>');
                this.$editor.on('click', '.exit-fullscreen', function (e) {
                    e.preventDefault();
                    instance.setFullscreen(false);
                });
            }

            // hide hidden buttons from options
            this.hideButtons(options.hiddenButtons);

            // disable disabled buttons from options
            this.disableButtons(options.disabledButtons);

            // Trigger the onShow hook
            options.onShow(this);

            return this;
        }

        , parseContent: function (val) {
            var content;

            // parse with supported markdown parser
            var val = val || this.$textarea.val();

            if (this.$options.parser) {
                content = this.$options.parser(val);
            } else if (typeof markdown == 'object') {
                content = markdown.toHTML(val);
            } else if (typeof marked == 'function') {
                content = marked(val);
            } else {
                content = val;
            }

            return content;
        }

        , showPreview: function () {
            var options = this.$options,
                container = this.$textarea,
                afterContainer = container.next(),
                replacementContainer = $('<div/>', {'class': 'md-preview', 'data-provider': 'markdown-preview'}),
                content,
                callbackContent;

            if (this.$isPreview == true) {
                // Avoid sequenced element creation on missused scenario
                // @see https://github.com/toopay/bootstrap-markdown/issues/170
                return this;
            }

            // Give flag that tell the editor enter preview mode
            this.$isPreview = true;
            // Disable all buttons
            this.disableButtons('all').enableButtons('cmdPreview');


            if (afterContainer && afterContainer.attr('class') == 'md-footer') {
                // If there is footer element, insert the preview container before it
                replacementContainer.insertBefore(afterContainer);
            } else {
                // Otherwise, just append it after textarea
                container.parent().append(replacementContainer);
            }

            this.$previewarea = replacementContainer;
            // Try to get the content from callback

            // Set the content based from the callback content if string otherwise parse value from textarea
            //content = typeof callbackContent == 'string' ? callbackContent : this.parseContent();

            // Build preview element
//      replacementContainer.html(content);

            // Set the preview element dimensions
            this.$previewarea.css({
                //width: container.outerWidth() + 'px',
                //height: container.outerHeight() + 'px'
            });

            if (this.$options.resize) {
                this.$previewarea.css('resize', this.$options.resize);
            }

            // Hide the last-active textarea
            container.hide();


            this.__alterButtons('cmdPreview', function(el)
            {
                el.html('Edit')
            });

            // Attach the editor instances
            this.$previewarea.data('markdown', this);


            if (this.$element.is(':disabled') || this.$element.is('[readonly]') || this.$options.previewonly) {
                this.$editor.addClass('md-editor-disabled');
                this.disableButtons('all');
            }

            callbackContent = options.onPreview(this);

            return this;
        }

        , hidePreview: function () {
            // Give flag that tell the editor quit preview mode
            this.$isPreview = false;

            // Obtain the preview container
            var container = this.$editor.find('div[data-provider="markdown-preview"]');

            // Remove the preview container
            container.remove();

            this.__alterButtons('cmdPreview', function(el)
            {
                el.html('Preview')
            });


            // Enable all buttons
            this.enableButtons('all');
            // Disable configured disabled buttons
            this.disableButtons(this.$options.disabledButtons);


            // Back to the editor
            this.$textarea.show();
            this.__setListener();



            return this;
        }

        , isDirty: function () {
            return this.$oldContent != this.getContent();
        }

        , getContent: function () {
            return this.$textarea.val();
        }

        , setContent: function (content) {
            this.$textarea.val(content);

            return this;
        }

        , findSelection: function (chunk) {
            var content = this.getContent(), startChunkPosition;

            if (startChunkPosition = content.indexOf(chunk), startChunkPosition >= 0 && chunk.length > 0) {
                var oldSelection = this.getSelection(), selection;

                this.setSelection(startChunkPosition, startChunkPosition + chunk.length);
                selection = this.getSelection();

                this.setSelection(oldSelection.start, oldSelection.end);

                return selection;
            } else {
                return null;
            }
        }

        , getSelection: function () {

            var e = this.$textarea[0];

            return (

                ('selectionStart' in e && function () {
                    var l = e.selectionEnd - e.selectionStart;
                    return {
                        start: e.selectionStart,
                        end: e.selectionEnd,
                        length: l,
                        text: e.value.substr(e.selectionStart, l)
                    };
                }) ||

                    /* browser not supported */
                function () {
                    return null;
                }

            )();

        }

        , setSelection: function (start, end) {

            var e = this.$textarea[0];

            return (

                ('selectionStart' in e && function () {
                    e.selectionStart = start;
                    e.selectionEnd = end;
                    return;
                }) ||

                    /* browser not supported */
                function () {
                    return null;
                }

            )();

        }

        , replaceSelection: function (text) {

            var e = this.$textarea[0];

            return (

                ('selectionStart' in e && function () {
                    e.value = e.value.substr(0, e.selectionStart) + text + e.value.substr(e.selectionEnd, e.value.length);
                    // Set cursor to the last replacement end
                    e.selectionStart = e.value.length;
                    return this;
                }) ||

                    /* browser not supported */
                function () {
                    e.value += text;
                    return jQuery(e);
                }

            )();
        }

        , getNextTab: function () {
            // Shift the nextTab
            if (this.$nextTab.length === 0) {
                return null;
            } else {
                var nextTab, tab = this.$nextTab.shift();

                if (typeof tab == 'function') {
                    nextTab = tab();
                } else if (typeof tab == 'object' && tab.length > 0) {
                    nextTab = tab;
                }

                return nextTab;
            }
        }

        , setNextTab: function (start, end) {
            // Push new selection into nextTab collections
            if (typeof start == 'string') {
                var that = this;
                this.$nextTab.push(function () {
                    return that.findSelection(start);
                });
            } else if (typeof start == 'number' && typeof end == 'number') {
                var oldSelection = this.getSelection();

                this.setSelection(start, end);
                this.$nextTab.push(this.getSelection());

                this.setSelection(oldSelection.start, oldSelection.end);
            }

            return;
        }

        , __parseButtonNameParam: function (names) {
            return typeof names == 'string' ?
                names.split(' ') :
                names;

        }

        , enableButtons: function (name) {
            var buttons = this.__parseButtonNameParam(name),
                that = this;

            $.each(buttons, function (i, v) {
                that.__alterButtons(buttons[i], function (el) {
                    el.removeAttr('disabled');
                });
            });

            return this;
        }

        , disableButtons: function (name) {
            var buttons = this.__parseButtonNameParam(name),
                that = this;

            $.each(buttons, function (i, v) {
                that.__alterButtons(buttons[i], function (el) {
                    el.attr('disabled', 'disabled');
                });
            });

            return this;
        }

        , hideButtons: function (name) {
            var buttons = this.__parseButtonNameParam(name),
                that = this;

            $.each(buttons, function (i, v) {
                that.__alterButtons(buttons[i], function (el) {
                    el.addClass('hidden');
                });
            });

            return this;
        }

        , showButtons: function (name) {
            var buttons = this.__parseButtonNameParam(name),
                that = this;

            $.each(buttons, function (i, v) {
                that.__alterButtons(buttons[i], function (el) {
                    el.removeClass('hidden');
                });
            });

            return this;
        }

        , eventSupported: function (eventName) {
            var isSupported = eventName in this.$element;
            if (!isSupported) {
                this.$element.setAttribute(eventName, 'return;');
                isSupported = typeof this.$element[eventName] === 'function';
            }
            return isSupported;
        }

        , keyup: function (e) {
            var blocked = false;
            switch (e.keyCode) {
                case 40: // down arrow
                case 38: // up arrow
                case 16: // shift
                case 17: // ctrl
                case 18: // alt
                    break;

                case 9: // tab
                    var nextTab;
                    if (nextTab = this.getNextTab(), nextTab !== null) {
                        // Get the nextTab if exists
                        var that = this;
                        setTimeout(function () {
                            that.setSelection(nextTab.start, nextTab.end);
                        }, 500);

                        blocked = true;
                    } else {
                        // The next tab memory contains nothing...
                        // check the cursor position to determine tab action
                        var cursor = this.getSelection();

                        if (cursor.start == cursor.end && cursor.end == this.getContent().length) {
                            // The cursor already reach the end of the content
                            blocked = false;
                        } else {
                            // Put the cursor to the end
                            this.setSelection(this.getContent().length, this.getContent().length);

                            blocked = true;
                        }
                    }

                    break;

                case 13: // enter
                    blocked = false;
                    break;
                case 27: // escape
                    if (this.$isFullscreen) this.setFullscreen(false);
                    blocked = false;
                    break;

                default:
                    blocked = false;
            }

            if (blocked) {
                e.stopPropagation();
                e.preventDefault();
            }

            this.$options.onChange(this);
        }

        , change: function (e) {
            this.$options.onChange(this);
            return this;
        }
        , select: function (e) {
            this.$options.onSelect(this);
            return this;
        }
        , focus: function (e) {
            var options = this.$options,
                isHideable = options.hideable,
                editor = this.$editor;

            editor.addClass('active');

            // Blur other markdown(s)
            $(document).find('.md-editor').each(function () {
                if ($(this).attr('id') !== editor.attr('id')) {
                    var attachedMarkdown;

                    if (attachedMarkdown = $(this).find('textarea').data('markdown'),
                        attachedMarkdown === null) {
                        attachedMarkdown = $(this).find('div[data-provider="markdown-preview"]').data('markdown');
                    }

                    if (attachedMarkdown) {
                        attachedMarkdown.blur();
                    }
                }
            });

            // Trigger the onFocus hook
            options.onFocus(this);

            return this;
        }

        , blur: function (e) {
            var options = this.$options,
                isHideable = options.hideable,
                editor = this.$editor,
                editable = this.$editable;

            if (editor.hasClass('active') || this.$element.parent().length === 0) {
                editor.removeClass('active');

                if (isHideable) {
                    // Check for editable elements
                    if (editable.el !== null) {
                        // Build the original element
                        var oldElement = $('<' + editable.type + '/>'),
                            content = this.getContent(),
                            currentContent = this.parseContent(content);

                        $(editable.attrKeys).each(function (k, v) {
                            oldElement.attr(editable.attrKeys[k], editable.attrValues[k]);
                        });

                        // Get the editor content
                        oldElement.html(currentContent);

                        editor.replaceWith(oldElement);
                    } else {
                        editor.hide();
                    }
                }

                // Trigger the onBlur hook
                options.onBlur(this);
            }

            return this;
        }

    };

    /* MARKDOWN PLUGIN DEFINITION
     * ========================== */

    var old = $.fn.markdown;

    $.fn.markdown = function (option) {
        return this.each(function () {
            var $this = $(this)
                , data = $this.data('markdown')
                , options = typeof option == 'object' && option;
            if (!data) $this.data('markdown', (data = new Markdown(this, options)))
        })
    };

    $.fn.markdown.messages = {};

    $.fn.markdown.defaults = {
        /* Editor Properties */
        autofocus: false,
        hideable: false,
        savable: false,
        width: 'inherit',
        height: 'inherit',
        resize: 'none',
        iconlibrary: 'glyph',
        language: 'en',
        initialstate: 'editor',
        parser: null,

        /* Buttons Properties */
        buttons: [
            [{
                name: 'groupFont',
                data: [{
                    name: 'cmdBold',
                    hotkey: 'Ctrl+B',
                    title: 'Bold',
                    icon: {glyph: 'glyphicon glyphicon-bold', fa: 'fa fa-bold', 'fa-3': 'icon-bold'},
                    callback: function (e) {
                        // Give/remove ** surround the selection
                        var chunk, cursor, selected = e.getSelection(), content = e.getContent();

                        if (selected.length === 0) {
                            // Give extra word
                            chunk = e.__localize('strong text');
                        } else {
                            chunk = selected.text;
                        }

                        // transform selection and set the cursor into chunked text
                        if (content.substr(selected.start - 2, 2) === '**'
                            && content.substr(selected.end, 2) === '**') {
                            e.setSelection(selected.start - 2, selected.end + 2);
                            e.replaceSelection(chunk);
                            cursor = selected.start - 2;
                        } else {
                            e.replaceSelection('**' + chunk + '**');
                            cursor = selected.start + 2;
                        }

                        // Set the cursor
                        e.setSelection(cursor, cursor + chunk.length);
                    }
                }, {
                    name: 'cmdItalic',
                    title: 'Italic',
                    hotkey: 'Ctrl+I',
                    icon: {glyph: 'glyphicon glyphicon-italic', fa: 'fa fa-italic', 'fa-3': 'icon-italic'},
                    callback: function (e) {
                        // Give/remove * surround the selection
                        var chunk, cursor, selected = e.getSelection(), content = e.getContent();

                        if (selected.length === 0) {
                            // Give extra word
                            chunk = e.__localize('emphasized text');
                        } else {
                            chunk = selected.text;
                        }

                        // transform selection and set the cursor into chunked text
                        if (content.substr(selected.start - 1, 1) === '_'
                            && content.substr(selected.end, 1) === '_') {
                            e.setSelection(selected.start - 1, selected.end + 1);
                            e.replaceSelection(chunk);
                            cursor = selected.start - 1;
                        } else {
                            e.replaceSelection('_' + chunk + '_');
                            cursor = selected.start + 1;
                        }

                        // Set the cursor
                        e.setSelection(cursor, cursor + chunk.length);
                    }
                }, {
                    name: 'cmdHeading',
                    title: 'Heading',
                    hotkey: 'Ctrl+H',
                    icon: {glyph: 'glyphicon glyphicon-header', fa: 'fa fa-header', 'fa-3': 'icon-font'},
                    callback: function (e) {
                        // Append/remove ### surround the selection
                        var chunk, cursor, selected = e.getSelection(), content = e.getContent(), pointer, prevChar;

                        if (selected.length === 0) {
                            // Give extra word
                            chunk = e.__localize('heading text');
                        } else {
                            chunk = selected.text + '\n';
                        }

                        // transform selection and set the cursor into chunked text
                        if ((pointer = 4, content.substr(selected.start - pointer, pointer) === '### ')
                            || (pointer = 3, content.substr(selected.start - pointer, pointer) === '###')) {
                            e.setSelection(selected.start - pointer, selected.end);
                            e.replaceSelection(chunk);
                            cursor = selected.start - pointer;
                        } else if (selected.start > 0 && (prevChar = content.substr(selected.start - 1, 1), !!prevChar && prevChar != '\n')) {
                            e.replaceSelection('\n\n### ' + chunk);
                            cursor = selected.start + 6;
                        } else {
                            // Empty string before element
                            e.replaceSelection('### ' + chunk);
                            cursor = selected.start + 4;
                        }

                        // Set the cursor
                        e.setSelection(cursor, cursor + chunk.length);
                    }
                }]
            }, {
                name: 'groupLink',
                data: [{
                    name: 'cmdUrl',
                    title: 'URL/Link',
                    hotkey: 'Ctrl+L',
                    icon: {glyph: 'glyphicon glyphicon-link', fa: 'fa fa-link', 'fa-3': 'icon-link'},
                    callback: function (e) {
                        // Give [] surround the selection and prepend the link
                        var chunk, cursor, selected = e.getSelection(), content = e.getContent(), link;

                        if (selected.length === 0) {
                            // Give extra word
                            chunk = e.__localize('enter link description here');
                        } else {
                            chunk = selected.text;
                        }

                        link = prompt(e.__localize('Insert Hyperlink'), 'http://');

                        if (link !== null && link !== '' && link !== 'http://' && link.substr(0, 4) === 'http') {
                            var sanitizedLink = $('<div>' + link + '</div>').text();

                            // transform selection and set the cursor into chunked text
                            e.replaceSelection('[' + chunk + '](' + sanitizedLink + ')');
                            cursor = selected.start + 1;

                            // Set the cursor
                            e.setSelection(cursor, cursor + chunk.length);
                        }
                    }
                }, {
                    name: 'cmdImage',
                    title: 'Image',
                    hotkey: 'Ctrl+G',
                    icon: {glyph: 'glyphicon glyphicon-picture', fa: 'fa fa-picture-o', 'fa-3': 'icon-picture'},
                    callback: function (e) {
                        // Give ![] surround the selection and prepend the image link
                        var chunk, cursor, selected = e.getSelection(), content = e.getContent(), link;

                        if (selected.length === 0) {
                            // Give extra word
                            chunk = e.__localize('enter image description here');
                        } else {
                            chunk = selected.text;
                        }

                        link = prompt(e.__localize('Insert Image Hyperlink'), 'http://');

                        if (link !== null && link !== '' && link !== 'http://' && link.substr(0, 4) === 'http') {
                            var sanitizedLink = $('<div>' + link + '</div>').text();

                            // transform selection and set the cursor into chunked text
                            e.replaceSelection('![' + chunk + '](' + sanitizedLink + ' "' + e.__localize('enter image title here') + '")');
                            cursor = selected.start + 2;

                            // Set the next tab
                            e.setNextTab(e.__localize('enter image title here'));

                            // Set the cursor
                            e.setSelection(cursor, cursor + chunk.length);
                        }
                    }
                }]
            }, {
                name: 'groupMisc',
                data: [{
                    name: 'cmdList',
                    hotkey: 'Ctrl+U',
                    title: 'Unordered List',
                    icon: {glyph: 'glyphicon glyphicon-list', fa: 'fa fa-list', 'fa-3': 'icon-list-ul'},
                    callback: function (e) {
                        // Prepend/Give - surround the selection
                        var chunk, cursor, selected = e.getSelection(), content = e.getContent();

                        // transform selection and set the cursor into chunked text
                        if (selected.length === 0) {
                            // Give extra word
                            chunk = e.__localize('list text here');

                            e.replaceSelection('- ' + chunk);
                            // Set the cursor
                            cursor = selected.start + 2;
                        } else {
                            if (selected.text.indexOf('\n') < 0) {
                                chunk = selected.text;

                                e.replaceSelection('- ' + chunk);

                                // Set the cursor
                                cursor = selected.start + 2;
                            } else {
                                var list = [];

                                list = selected.text.split('\n');
                                chunk = list[0];

                                $.each(list, function (k, v) {
                                    list[k] = '- ' + v;
                                });

                                e.replaceSelection('\n\n' + list.join('\n'));

                                // Set the cursor
                                cursor = selected.start + 4;
                            }
                        }

                        // Set the cursor
                        e.setSelection(cursor, cursor + chunk.length);
                    }
                },
                    {
                        name: 'cmdListO',
                        hotkey: 'Ctrl+O',
                        title: 'Ordered List',
                        icon: {glyph: 'glyphicon glyphicon-th-list', fa: 'fa fa-list-ol', 'fa-3': 'icon-list-ol'},
                        callback: function (e) {

                            // Prepend/Give - surround the selection
                            var chunk, cursor, selected = e.getSelection(), content = e.getContent();

                            // transform selection and set the cursor into chunked text
                            if (selected.length === 0) {
                                // Give extra word
                                chunk = e.__localize('list text here');
                                e.replaceSelection('1. ' + chunk);
                                // Set the cursor
                                cursor = selected.start + 3;
                            } else {
                                if (selected.text.indexOf('\n') < 0) {
                                    chunk = selected.text;

                                    e.replaceSelection('1. ' + chunk);

                                    // Set the cursor
                                    cursor = selected.start + 3;
                                } else {
                                    var list = [];

                                    list = selected.text.split('\n');
                                    chunk = list[0];

                                    $.each(list, function (k, v) {
                                        list[k] = '1. ' + v;
                                    });

                                    e.replaceSelection('\n\n' + list.join('\n'));

                                    // Set the cursor
                                    cursor = selected.start + 5;
                                }
                            }

                            // Set the cursor
                            e.setSelection(cursor, cursor + chunk.length);
                        }
                    },
                    {
                        name: 'cmdCode',
                        hotkey: 'Ctrl+K',
                        title: 'Code',
                        icon: {glyph: 'glyphicon glyphicon-asterisk', fa: 'fa fa-code', 'fa-3': 'icon-code'},
                        callback: function (e) {
                            // Give/remove ** surround the selection
                            var chunk, cursor, selected = e.getSelection(), content = e.getContent();

                            if (selected.length === 0) {
                                // Give extra word
                                chunk = e.__localize('code text here');
                            } else {
                                chunk = selected.text;
                            }

                            // transform selection and set the cursor into chunked text
                            if (content.substr(selected.start - 4, 4) === '```\n'
                                && content.substr(selected.end, 4) === '\n```') {
                                e.setSelection(selected.start - 4, selected.end + 4);
                                e.replaceSelection(chunk);
                                cursor = selected.start - 4;
                            } else if (content.substr(selected.start - 1, 1) === '`'
                                && content.substr(selected.end, 1) === '`') {
                                e.setSelection(selected.start - 1, selected.end + 1);
                                e.replaceSelection(chunk);
                                cursor = selected.start - 1;
                            } else if (content.indexOf('\n') > -1) {
                                e.replaceSelection('```\n' + chunk + '\n```');
                                cursor = selected.start + 4;
                            } else {
                                e.replaceSelection('`' + chunk + '`');
                                cursor = selected.start + 1;
                            }

                            // Set the cursor
                            e.setSelection(cursor, cursor + chunk.length);
                        }
                    },
                    {
                        name: 'cmdQuote',
                        hotkey: 'Ctrl+Q',
                        title: 'Quote',
                        icon: {glyph: 'glyphicon glyphicon-comment', fa: 'fa fa-quote-left', 'fa-3': 'icon-quote-left'},
                        callback: function (e) {
                            // Prepend/Give - surround the selection
                            var chunk, cursor, selected = e.getSelection(), content = e.getContent();

                            // transform selection and set the cursor into chunked text
                            if (selected.length === 0) {
                                // Give extra word
                                chunk = e.__localize('quote here');

                                e.replaceSelection('> ' + chunk);

                                // Set the cursor
                                cursor = selected.start + 2;
                            } else {
                                if (selected.text.indexOf('\n') < 0) {
                                    chunk = selected.text;

                                    e.replaceSelection('> ' + chunk);

                                    // Set the cursor
                                    cursor = selected.start + 2;
                                } else {
                                    var list = [];

                                    list = selected.text.split('\n');
                                    chunk = list[0];

                                    $.each(list, function (k, v) {
                                        list[k] = '> ' + v;
                                    });

                                    e.replaceSelection('\n\n' + list.join('\n'));

                                    // Set the cursor
                                    cursor = selected.start + 4;
                                }
                            }

                            // Set the cursor
                            e.setSelection(cursor, cursor + chunk.length);
                        }
                    }]
            }, {
                name: 'groupUtil',
                data: [{
                    name: 'cmdPreview',
                    toggle: true,
                    hotkey: 'Ctrl+P',
                    title: 'Preview',
                    btnText: 'Preview',
                    btnClass: 'btn btn-primary btn-sm',
                    icon: {glyph: 'glyphicon glyphicon-search', fa: 'fa fa-search', 'fa-3': 'icon-search'},
                    callback: function (e) {
                        // Check the preview mode and toggle based on this flag
                        var isPreview = e.$isPreview, content;

                        if (isPreview === false) {
                            // Give flag that tell the editor enter preview mode
                            e.showPreview();
                        } else {
                            e.hidePreview();
                        }
                    }
                }]
            }]
        ],
        additionalButtons: [], // Place to hook more buttons by code
        reorderButtonGroups: [],
        hiddenButtons: [], // Default hidden buttons
        disabledButtons: [], // Default disabled buttons
        footer: '',
        fullscreen: {
            enable: true,
            icons: {
                fullscreenOn: {
                    fa: 'fa fa-expand',
                    glyph: 'glyphicon glyphicon-fullscreen',
                    'fa-3': 'icon-resize-full'
                },
                fullscreenOff: {
                    fa: 'fa fa-compress',
                    glyph: 'glyphicon glyphicon-fullscreen',
                    'fa-3': 'icon-resize-small'
                }
            }
        },

        /* Events hook */
        onShow: function (e) {
        },
        onPreview: function (e) {
        },
        onSave: function (e) {
        },
        onBlur: function (e) {
        },
        onFocus: function (e) {
        },
        onChange: function (e) {
        },
        onFullscreen: function (e) {
        },
        onSelect: function (e) {
        }
    };

    $.fn.markdown.Constructor = Markdown;


    /* MARKDOWN NO CONFLICT
     * ==================== */

    $.fn.markdown.noConflict = function () {
        $.fn.markdown = old;
        return this;
    };

    /* MARKDOWN GLOBAL FUNCTION & DATA-API
     * ==================================== */
 /*   var initMarkdown = function (el) {
        var $this = el;

        if ($this.data('markdown')) {
            $this.data('markdown').showEditor();
            return;
        }

        $this.markdown()
    };*/

    var blurNonFocused = function (e) {
        var $activeElement = $(document.activeElement);

        // Blur event
        $(document).find('.md-editor').each(function () {
            var $this = $(this),
                focused = $activeElement.closest('.md-editor')[0] === this,
                attachedMarkdown = $this.find('textarea').data('markdown') ||
                    $this.find('div[data-provider="markdown-preview"]').data('markdown');

            if (attachedMarkdown && !focused) {
                attachedMarkdown.blur();
            }
        })
    };

    $(document)
/*        .on('click.markdown.data-api', '[data-provide="markdown-editable"]', function (e) {
            initMarkdown($(this));
            e.preventDefault();
        })*/
        .on('click focusin', function (e) {
            blurNonFocused(e);
        })
        .ready(function () {
//            $('textarea[data-provide="markdown"]').each(function () {
//                initMarkdown($(this));
//                this.showPreview();
//            })
        });

}(window.jQuery);

/**
 * Created by Sun on 15/8/23.
 */

function addEvent(element, evnt, funct) {
    if (element.attachEvent)
        return element.attachEvent('on' + evnt, funct);
    else
        return element.addEventListener(evnt, funct, false);
}
function setInnerText(element, text) {
    if (typeof element.textContent !== 'undefined') {
        element.textContent = text;
    } else {
        element.innerText = text;
    }
}
function getScriptBase(filename) {
    var origin = '',
        scriptEls = document.getElementsByTagName('script');
    for (var i = 0; i < scriptEls.length; i++) {
        if (scriptEls[i].src.match(filename)) {
            origin = scriptEls[i].src;
        }
    }
    return origin.substr(0, origin.lastIndexOf('/'));
}
function upsertTheme(base, theme) {
    var found = false,
        csses = document.getElementsByTagName("link")
    for (var i = csses.length - 1; i >= 0; i--) {
        if (csses[i].rel == 'stylesheet' && csses[i].href.match(base + "/themes/")) {
            csses[i].href = base + '/themes/' + theme + '.min.css';
            found = true;
            break;
        }
    }
    if (!found) {
        var linkEl = document.createElement('link');
        linkEl.href = base + '/themes/' + theme + '.min.css';
        linkEl.rel = 'stylesheet';
        document.head.appendChild(linkEl);
    }
}

function render(preview_element, markdown, theme, heading_number, show_toc) {

    //////////////////////////////////////////////////////////////////////
    //
    // Markdown!
    //

    // From math.stackexchange.com...
    // borrowed from https://github.com/benweet/stackedit, thanks
    // https://stackedit-beta.herokuapp.com/res/extensions/mathJax.js

    //
    //  The math is in blocks i through j, so
    //    collect it into one block and clear the others.
    //  Replace &, <, and > by named entities.
    //  For IE, put <br> at the ends of comments since IE removes \n.
    //  Clear the current math positions and store the index of the
    //    math, then push the math string onto the storage array.
    //
    var blocks, start, end, last, braces, math;

    while (preview_element.firstChild) {
        preview_element.removeChild(preview_element.firstChild);
    }

    var newNode = document.createElement("div");
    preview_element.appendChild(newNode);

    function isMSIE() {
        var ua = window.navigator.userAgent;
        var msie = ua.indexOf('MSIE ');
        var trident = ua.indexOf('Trident/');

        if (msie > 0) {
            // IE 10 or older => return version number
            return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
        }

        if (trident > 0) {
            // IE 11 (or newer) => return version number
            var rv = ua.indexOf('rv:');
            return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
        }

        // other browser
        return false;
    }

    function processMath(i, j, unescape) {
        var block = blocks.slice(i, j + 1).join("")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        for (isMSIE() && (block = block.replace(/(%[^\n]*)\n/g, "$1<br/>\n")); j > i;)
            blocks[j] = "", j--;
        blocks[i] = "@@@@" + math.length + "@@@@";
        unescape && (block = unescape(block));
        math.push(block);
        start = end = last = null;
    }

    function removeMath(text) {
        start = end = last = null;
        math = [];
        var unescape;
        if (/`/.test(text)) {
            text = text.replace(/~/g, "~T").replace(/(^|[^\\])(`+)([^\n]*?[^`\n])\2(?!`)/gm, function (text) {
                return text.replace(/\$/g, "~D")
            });
            unescape = function (text) {
                return text.replace(/~([TD])/g,
                    function (match, n) {
                        return {T: "~", D: "$"}[n]
                    })
            };
        } else {
            unescape = function (text) {
                return text
            };
        }
        blocks = split(text.replace(/\r\n?/g, "\n"), splitDelimiter);
        for (var i = 1, m = blocks.length; i < m; i += 2) {
            var block = blocks[i];
            if ("@" === block.charAt(0)) {
                //
                //  Things that look like our math markers will get
                //  stored and then retrieved along with the math.
                //
                blocks[i] = "@@@@" + math.length + "@@@@";
                math.push(block)
            } else if (start) {
                // Ignore inline maths that are actually multiline (fixes #136)
                if (end == '$' && block.match(/\n/)) {
                    if (last) {
                        i = last;
                        processMath(start, i, unescape);
                    }
                    start = end = last = null;
                    braces = 0;
                }
                //
                //  If we are in math, look for the end delimiter,
                //    but don't go past double line breaks, and
                //    and balance braces within the math.
                //
                else if (block === end) {
                    if (braces) {
                        last = i
                    } else {
                        processMath(start, i, unescape)
                    }
                } else {
                    if (block.match(/\n.*\n/)) {
                        if (last) {
                            i = last;
                            processMath(start, i, unescape);
                        }
                        start = end = last = null;
                        braces = 0;
                    } else {
                        if ("{" === block) {
                            braces++
                        } else {
                            "}" === block && braces && braces--
                        }
                    }
                }
            } else {
                if (block === '$' || "$$" === block) {
                    start = i;
                    end = block;
                    braces = 0;
                } else {
                    if ("begin" === block.substr(1, 5)) {
                        start = i;
                        end = "\\end" + block.substr(6);
                        braces = 0;
                    }
                }
            }

        }
        last && processMath(start, last, unescape);
        return unescape(blocks.join(""))
    }

    //
    //  Put back the math strings that were saved,
    //    and clear the math array (no need to keep it around).
    //
    function replaceMath(text) {
        text = text.replace(/@@@@(\d+)@@@@/g, function (match, n) {
            return math[n]
        });
        math = null;
        return text
    }

    //
    //  The pattern for math delimiters and special symbols
    //    needed for searching for math in the page.
    //
    var splitDelimiter = /(\$\$?|\\(?:begin|end)\{[a-z]*\*?\}|\\[\\{}$]|[{}]|(?:\n\s*)+|@@@@\d+@@@@)/i;
    var split;

    if (3 === "aba".split(/(b)/).length) {
        split = function (text, delimiter) {
            return text.split(delimiter)
        };
    } else {
        split = function (text, delimiter) {
            var b = [], c;
            if (!delimiter.global) {
                c = delimiter.toString();
                var d = "";
                c = c.replace(/^\/(.*)\/([im]*)$/, function (a, c, b) {
                    d = b;
                    return c
                });
                delimiter = RegExp(c, d + "g")
            }
            for (var e = delimiter.lastIndex = 0; c = delimiter.exec(text);) {
                b.push(text.substring(e, c.index));
                b.push.apply(b, c.slice(1));
                e = c.index + c[0].length;
            }
            b.push(text.substring(e));
            return b
        };
    }

    var toc = [];
    var heading_counter = [0, 0, 0, 0, 0, 0];

    var hn_table = ['i', 'i', 'i', 'i', 'i', 'i'];
    if (heading_number && heading_number != 'none' && heading_number != "false") {
        var ary = heading_number.split('.');
        for (var i = 0; i < 6; i++) {
            if (ary[i] == 'a') {
                hn_table[i] = 'a';
            }
        }
    }

    var itoa = function (i, j) {
        if (hn_table[j] == 'a' && i <= 26) {
            return String.fromCharCode(96 + i);
        } else {
            return '' + i;
        }
    }

    var counter_to_str = function (hc) {
        var i = 5;
        var ret = "" + itoa(hc[0], 0);
        for (; i >= 0; i--) {
            if (hc[i]) break;
        }
        for (var j = 1; j <= i; j++) {
            ret += "." + itoa(hc[j], j);
        }
        return ret;
    };

    var toc = [];

    var renderer = new marked.Renderer();
    renderer.heading = function (text, level) {

        heading_counter[level - 1]++;
        for (var i = level; i < 6; i++) {
            heading_counter[i] = 0;
        }

        var heading_number_str = counter_to_str(heading_counter);

        var escapedText = 'h' + heading_number_str + '_' + text.toLowerCase().replace(/[^-_.\w\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+/g, '-');

        // generate heading
        var before_heading;
        if (!heading_number || heading_number == 'none' || heading_number == "false") {
            before_heading = '';
        } else {
            before_heading = heading_number_str + ' ';
        }

        // for table of content
        var a = toc;
        for (var i = 0; i < level - 1; i++) {
            if (a.length == 0 || !Array.isArray(a[a.length - 1])) {
                a.push([]);
            }
            a = a[a.length - 1];
        }
        a.push({
            'target': '#' + escapedText,
            'title': before_heading + text
        });

        return '<h' + level + ' style="position:relative;"><a name="' +
            escapedText +
            '" class="anchor" href="#' +
            escapedText +
            '"><span class="header-link"></span></a>' + before_heading +
            text + '</h' + level + '>';
    }

    // Generate Markdown
    var markdown_without_mathjax = removeMath(markdown);
    var html = marked(markdown_without_mathjax, {renderer: renderer});

    var html_with_mathjax = replaceMath(html);

    if (show_toc) {
        var toc_html = document.createElement('ul');

        var traverse = function (list, ul) {
            for (var i = 0; i < list.length; i++) {
                var e;
                if (Array.isArray(list[i])) {
                    e = document.createElement('ul');
                    traverse(list[i], e);
                } else {
                    e = document.createElement('li');
                    var a = document.createElement('a');
                    a.setAttribute('href', list[i].target);
                    a.appendChild(document.createTextNode(list[i].title));
                    e.appendChild(a);
                }
                ul.appendChild(e);
            }
        };
        traverse(toc, toc_html);

        var div = document.createElement('div');
        var title = document.createElement('h1');
        title.appendChild(document.createTextNode('Table of Content'));
        div.appendChild(title);
        div.appendChild(document.createElement('hr'));
        div.appendChild(toc_html);
        div.appendChild(document.createElement('hr'));
        newNode.appendChild(div);
    }

    var content = document.createElement('div');
    content.innerHTML = html_with_mathjax;

    newNode.appendChild(content);

    if (html_with_mathjax != html) {
        //if (!window.MathJax) {
        //    var script = document.createElement("script");
        //    script.type = "text/javascript";
        //    script.src = "../vendor/MathJax/MathJax.js?config=TeX-AMS-MML_SVG";
        //
        //    var callback = function () {
        //        // config options
        //        // http://docs.mathjax.org/en/latest/options/tex2jax.html#configure-tex2jax
        //        MathJax.Ajax.timeout = 60000;
        //        MathJax.Hub.Config({
        //            tex2jax: {
        //                inlineMath: [['$', '$']],
        //                displayMath: [['$$', '$$']],
        //                processEscapes: true,
        //                balanceBraces: true,
        //            },
        //            messageStyle: "none",
        //            SVG: {
        //                styles: {
        //                    ".MathJax_SVG svg > g, .MathJax_SVG_Display svg > g": {
        //                        "fill": "#4d4d4c",
        //                        "stroke": "#4d4d4c"
        //                    }
        //                },
        //                scale: 100
        //            }
        //        });
        //        MathJax.Hub.Queue(["Typeset", MathJax.Hub, newNode]);
        //    }
        //    script.onload = callback;
        //    // for IE 6, IE 7
        //    script.onreadystatechange = function () {
        //        if (this.readyState == 'complete') {
        //            callback();
        //        }
        //    }
        //    document.getElementsByTagName("head")[0].appendChild(script);
        //} else {
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, newNode]);
//        }

    }

    if ('hljs' in window) {
        var codeEls = newNode.getElementsByTagName('code');
        for (var i = 0, ii = codeEls.length; i < ii; i++) {
            var codeEl = codeEls[i];
            var lang = codeEl.className;
            if (codeEl.parentNode.nodeName.toLowerCase() == 'pre') {
                codeEl.parentNode.className = 'code-wrapper ' + lang;
                hljs.highlightBlock(codeEl);
            }
        }
        // hljs.initHighlighting();
    } else if ('prettyPrint' in window) {
        // Prettify
        var codeEls = newNode.getElementsByTagName('code');
        for (var i = 0, ii = codeEls.length; i < ii; i++) {
            var codeEl = codeEls[i];
            var lang = codeEl.className;
            if (codeEl.parentNode.nodeName.toLowerCase() == 'pre') {
                codeEl.parentNode.className = 'code-wrapper prettyprint ' + lang;
            }
        }
        prettyPrint();
    }

    // Style tables
    var tableEls = newNode.getElementsByTagName('table');
    for (var i = 0, ii = tableEls.length; i < ii; i++) {
        var tableEl = tableEls[i];
        tableEl.className = 'table table-striped table-bordered';
    }

    html = preview_element.innerHTML;

    return html;
};


// directive
(function () {
    'use strict';
    angular.module('angular-power-marker', [])
        .directive('powermarker', ['$window', '$timeout',
            function ($window, $timeout) {
                return {
                    restrict: 'AE',
                    scope: {
                        // models
                        start: "@",
                        previewonly: "@"
                    },
                    replace: false,
                    link: function ($scope, element, attrs) {

                        function boolean_directive($scope, variable, default_val)
                        {
                            if ($scope[variable] == undefined)
                            {
                                $scope[variable] = default_val;
                            }

                            if (typeof($scope[variable]) != "boolean") {
                                    $scope[variable] = $scope.$eval($scope[variable]);
                                }

                            $scope.$watch(variable, function(newValue, oldValue) {

                                if (typeof($scope[variable]) != "boolean") {
                                    $scope[variable] = $scope.$eval($scope[variable]);
                                }
                            });
                        }

                        boolean_directive($scope, 'previewonly', true);


                        if ($scope.start == undefined)
                        {
                            $scope.start = "preview";
                        }

                        if ($scope.start != "preview" && $scope.start != "edit")
                        {
                            alert("Unknown how to start.");
                            $scope.start = "preview";
                        }

                        var on_preview = function (obj) {
                            var text = obj.$textarea.val();
                            var preview = obj.$previewarea[0];
                            return render(preview, text, null, null, true);
                        };
                        attrs.onPreview = on_preview;

                        if (attrs.onSave != undefined)
                        {
                            var onsave_func = $scope.$eval(attrs.onSave);
                            attrs.onSave = function(e) {
                                onsave_func(e.getContent());
                            };
                        }

                        attrs.start = $scope.start;
                        attrs.previewonly = $scope.previewonly;

                        var m = element.markdown(attrs);

                        $timeout(function(){
                            if(attrs.start == "preview")
                            {
                                m.data('markdown').showPreview();
                            }
                            else if (attrs.start == "edit")
                            {
                                m.data('markdown').showEditor();
                            }

                        });


                    },
                };
            }])
    ;

}).call(this);
