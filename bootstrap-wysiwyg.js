/* http://github.com/mindmup/bootstrap-wysiwyg */
/*global $, FileReader*/
/*jslint browser:true*/
$(function () {
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
	$.fn.wysiwyg = function (options) {
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
				toolbarRole: 'editor-toolbar',
				commandRole: 'edit'
			},
			execCommand = function (commandWithArgs, valueArg) {
				var commandArr = commandWithArgs.split(' '),
					command = commandArr.shift(),
					args = commandArr.join(' ') + (valueArg || '');
				document.execCommand(command, 0, args);
			},
			bindHotkeys = function (hotKeys) {
				$.each(hotKeys, function (hotkey, command) {
					editor.on('keyup keydown', hotkey, function (e) {
						if (editor.attr('contenteditable') && editor.is(':visible')) {
							e.preventDefault();
							e.stopPropagation();
							if (e.type === 'keydown' ) {
								execCommand(command);
							}
						}
					});
				});
			},
			getCurrentRange = function () {
				var sel = window.getSelection();
				if (sel.getRangeAt && sel.rangeCount) {
					return sel.getRangeAt(0);
				}
			},
			saveSelectionRange = function () {
				selectedRange = getCurrentRange();
			},
			restoreSelectionRange = function () {
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
			bindToolbar = function (toolbar, options) {
				toolbar.find('a[data-' + options.commandRole + ']').click(function () {
					restoreSelectionRange();
					execCommand($(this).data(options.commandRole));
					saveSelectionRange();
				});
				$('input[type=text][data-' + options.commandRole + ']', toolbar).on('webkitspeechchange change', function () {
					var newValue = this.value; /* ugly but prevents fake double-calls due to selection restoration */
					this.value = '';
					restoreSelectionRange();
					if (newValue) {
						editor.focus();
						execCommand($(this).data(options.commandRole), newValue);
					}
					saveSelectionRange();
				});
				toolbar.find('input[type=file][data-' + options.commandRole + ']').change(function () {
					restoreSelectionRange();
					if (this.type === 'file' && this.files && this.files.length > 0) {
						insertFiles(this.files);
					}
					saveSelectionRange();
				});
			},
			initFileDrops = function () {
				$.event.props.push('dataTransfer');
				editor.bind('dragenter dragover', false)
					.bind('drop', function (e) {
						e.stopPropagation();
						e.preventDefault();
						if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
							insertFiles(e.dataTransfer.files);
						}
					});
			};
		options = $.extend({}, defaultOptions, options);
		bindHotkeys(options.hotKeys);
		initFileDrops();
		$.each($.find('[data-role=' + options.toolbarRole + ']'), function () { bindToolbar($(this), options); });
		$.each(this, function () {
			var before,
				element = $(this);
			element.attr('contenteditable', true)
				.on('focus', function () {
					before = element.html();
				})
				.on('mouseup keyup mouseout', saveSelectionRange)
				.on('input blur keyup paste', function () {
					if (before !== element.html()) {
						before = element.html();
						element.trigger('change');
					}
				});
			$(window).bind('touchend', function (e) {
				var isInside = (e.target === element[0] || $(element).children().index($(e.target)) !== -1 || $(element).has(e.target).length > 0),
					currentRange = getCurrentRange(),
					clear = currentRange && (currentRange.startContainer === currentRange.endContainer && currentRange.startOffset === currentRange.endOffset);
				if (!clear || isInside) {
					saveSelectionRange();
				}
			});
		});
		return this;
	};
});
