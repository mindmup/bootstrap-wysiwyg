/* http://github.com/mindmup/bootstrap-wysiwyg */
/*global jQuery, $, FileReader*/
/*jslint browser:true*/
jQuery(function ($) {
    'use strict';
    var readFileIntoDataUrl = function (fileInfo) {
        var loader = $.Deferred(),
            fReader = new FileReader();
        fReader.onload = function (e) {
            loader.resolve(e.target.result);
        };
        fReader.onerror = loader.reject;
        fReader.onprogress = loader.notify;
        fReader.readAsDataURL(fileInfo);
        return loader.promise();
    };
    $.fn.cleanHtml = function () {
        var html = $(this).html();
        return html && html.replace(/(<br>|\s|<div><br><\/div>|&nbsp;)*$/, '');
    };
    $.fn.wysiwyg = function (userOptions) {
        var editor = this,
            selectedRange,
            defaultOptions = {
                hotKeys: {
                    'ctrl+b meta+b': 'bold',
                    'ctrl+i meta+i': 'italic',
                    'ctrl+u meta+u': 'underline',
                    'ctrl+z meta+z': 'undo',
                    'ctrl+y meta+y meta+shift+z': 'redo',
                    'ctrl+l meta+l': 'justifyleft',
                    'ctrl+r meta+r': 'justifyright',
                    'ctrl+e meta+e': 'justifycenter',
                    'ctrl+j meta+j': 'justifyfull',
                    'shift+tab': 'outdent',
                    'tab': 'indent'
                },
                toolbarSelector: '[data-role=editor-toolbar]',
                commandRole: 'edit',
                activeToolbarClass: 'btn-info',
                selectionMarker: 'edit-focus-marker',
                selectionColor: 'darkgrey'
            },
            options,
            updateToolbar = function () {
                if (options.activeToolbarClass) {
                    $(options.toolbarSelector).find('.btn[data-' + options.commandRole + ']').each(function () {
                        var command = $(this).data(options.commandRole);
                        if (document.queryCommandState(command)) {
                            $(this).addClass(options.activeToolbarClass);
                        } else {
                            $(this).removeClass(options.activeToolbarClass);
                        }
                    });
                }
            },
            execCommand = function (commandWithArgs, valueArg) {
                var commandArr = commandWithArgs.split(' '),
                    command = commandArr.shift(),
                    args = commandArr.join(' ') + (valueArg || '');
                document.execCommand(command, 0, args);
                updateToolbar();
            },
            bindHotkeys = function (hotKeys) {
                $.each(hotKeys, function (hotkey, command) {
                    editor.on('keydown keyup', function (e)) {
                        if (editor.attr('contenteditable') && editor.is(':visible')) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        if (e.type === 'keydown') {
                            execCommand(command);
                        }
                    }
                });
            },
            getCurrentRange = function () {
                var sel = window.getSelection();
                if (sel.getRangeAt && sel.rangeCount) {
                    return sel.getRangeAt(0);
                }
            },
            saveSelection = function () {
                selectedRange = getCurrentRange();
            },
            restoreSelection = function () {
                var selection = window.getSelection();
                if (selectedRange) {
                    selection.removeAllRanges();
                    selection.addRange(selectedRange);
                }
            },
            insertFiles = function (files) {
                editor.focus();
                $.each(files, function (idx, fileInfo) {
                    if (/^image\//.test(fileInfo.type)) {
                        $.when(readFileIntoDataUrl(fileInfo)).done(function (dataUrl) {
                            execCommand('insertimage', dataUrl);
                        });
                    }
                });
            },
            markSelection = function (input, color) {
                restoreSelection();
                document.execCommand('hiliteColor', 0, color || 'transparent');
                saveSelection();
                input.data(options.selectionMarker, color);
            },
            bindToolbar = function (toolbar, options) {
                toolbar.find('a[data-' + options.commandRole + ']').click(function () {
                    restoreSelection();
                    editor.focus();
                    execCommand($(this).data(options.commandRole));
                    saveSelection();
                });
                toolbar.find('[data-toggle=dropdown]').click(restoreSelection);

                toolbar.find('input[type=text][data-' + options.commandRole + ']').on('webkitspeechchange change', function () {
                    var newValue = this.value; /* ugly but prevents fake double-calls due to selection restoration */
                    this.value = '';
                    restoreSelection();
                    if (newValue) {
                        editor.focus();
                        execCommand($(this).data(options.commandRole), newValue);
                    }
                    saveSelection();
                }).on('focus', function () {
                    var input = $(this);
                    if (!input.data(options.selectionMarker)) {
                        markSelection(input, options.selectionColor);
                        input.focus();
                    }
                }).on('blur', function () {
                    var input = $(this);
                    if (input.data(options.selectionMarker)) {
                        markSelection(input, false);
                    }
                });
                toolbar.find('input[type=file][data-' + options.commandRole + ']').change(function () {
                    restoreSelection();
                    if (this.type === 'file' && this.files && this.files.length > 0) {
                        insertFiles(this.files);
                    }
                    saveSelection();
                    this.value = '';
                });
            },
            initFileDrops = function () {
                editor.on('dragenter dragover', false)
                    .on('drop', function (e) {
                        var dataTransfer = e.originalEvent.dataTransfer;
                        e.stopPropagation();
                        e.preventDefault();
                        if (dataTransfer && dataTransfer.files && dataTransfer.files.length > 0) {
                            insertFiles(dataTransfer.files);
                        }
                    });
            };
        options = $.extend({}, defaultOptions, userOptions);
        bindHotkeys(options.hotKeys);
        initFileDrops();
        bindToolbar($(options.toolbarSelector), options);
        editor.attr('contenteditable', true)
            .on('mouseup keyup mouseout', function () {
                saveSelection();
                updateToolbar();
            });
        $(window).bind('touchend', function (e) {
            var isInside = (editor.is(e.target) || editor.has(e.target).length > 0),
                currentRange = getCurrentRange(),
                clear = currentRange && (currentRange.startContainer === currentRange.endContainer && currentRange.startOffset === currentRange.endOffset);
            if (!clear || isInside) {
                saveSelection();
                updateToolbar();
            }
        });
        return this;
    };
});
