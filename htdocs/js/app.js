var multi = 
{
    create: function(form, button)
    {
        var bs = $.fn.blockstrap;
        var title = 'Warning';
        var contents = 'Unable to generate new address';
        var required = parseInt($(form).find('select[name="required"]').val());
        var used = parseInt($(form).find('select[name="used"]').val());
        var salt = $(form).find('input[name="salt"]').val();
        var seed = $(form).find('input[name="seed"]').val();
        var chain = $(form).find('select[name="chain"]').val();
        var blockchain = bs.settings.blockchains[chain].blockchain;
        if(required > used)
        {
            contents = 'Number of required keys cannot be higher than the number used'
            bs.core.modal(title, contents);
        }
        else
        {
            var keys = [];
            for(key_count = 0; key_count < used; key_count++) 
            {
                $(form).find('.bs-key-list input').each(function(k, input)
                {
                    if(k == key_count)
                    {
                        var key = $(this).val();
                        if(key) keys.push({hex:key});
                    }
                });
            }
            if(blockstrap_functions.array_length(keys) < used && !seed)
            {
                contents = 'Not enough keys provided';
                bs.core.modal(title, contents);
            }
            else if((seed && !salt) || (salt & !seed))
            {
                contents = 'Both salt and seed required to generate new keys';
                bs.core.modal(title, contents);
            }
            else
            {
                if(salt && seed)
                {
                    var hash = CryptoJS.SHA3(salt + seed, { outputLength: 512 }).toString();
                    keys = bs.multisig.generate(hash, chain, used, required);
                    var obj = keys.pop();
                    $.each(keys, function(k, key)
                    {
                        $(form).find('.bs-key-list input:nth-child('+(k+1)+')').val(key.hex);
                    });
                }
                try
                {
                    var objects = bs.multisig.generate(false, chain, keys, required);
                    var obj = objects.pop();
                    var script = obj.script;
                    var address = obj.address;
                    if(script && address)
                    {
                        title = 'Success';
                        contents = '<p>Generated a new P2SH Address:</p>'
                        contents+= '<input class="form-control" value="'+address+'" readonly="readonly" /><br>';
                        contents+= '<p>Please note that you <strong>MUST</strong> provide the reedem script code shown below in order to make a transaction later. It can only be generated with access to all of the public keys used when creating this address. Loss of this <strong>may result in loosing control of the address</strong> as all the public keys (or this code) are required to send transactions from the address.</p>';
                        contents+= '<textarea class="form-control" readonly="readonly">'+script+'</textarea>';
                    }
                    bs.core.modal(title, contents);
                }
                catch(error) 
                {
                    contents = 'One or more invalid public keys';
                    bs.core.modal(title, contents);
                }
            }
        }
    },
    decode: function(form)
    {
        var bs = $.fn.blockstrap;
        var title = 'Error';
        var contents = 'This is not a valid reedem script';
        var script = $(form).find('textarea[name="script"]').val();
        var chain = $(form).find('select[name="chain"]').val();
        if(!script)
        {
            contents = '<p>No reedem script provided</p>';
            bs.core.modal(title, contents);
        }
        else
        {
            try
            {
                var keys = $.fn.blockstrap.multisig.decode(script, chain);
                if($.isArray(keys))
                {
                    title = 'Script Decoded';
                    contents = '<p>The reedem script uses the following public keys:</p>';
                    $.each(keys, function(k, key)
                    {
                        contents+= '<hr>';
                        contents+= '<p><strong>Address:</strong> '+key.address+'</p>';
                        contents+= '<p><strong>Public Key (Hex):</strong> '+key.key+'</p>';
                    });
                    bs.core.modal(title, contents);
                }
                else
                {
                    bs.core.modal(title, contents);
                }
            }
            catch(error)
            {
                bs.core.modal(title, contents);
            }
        }
    },
    forms: function()
    {
        // Add salt if available...
        var salt = localStorage.getItem('nw_blockstrap_salt');
        if(blockstrap_functions.json(salt)) salt = $.parseJSON(salt);
        $('form.bs-multi').find('input[name="salt"]').val(salt);
        
        // Create Address
        $('body').on('submit', '#bs-create-multisig-address', function(e)
        {
            e.preventDefault();
            var button = $(this).find('button[type="submit"]');
            $(button).addClass('loading');
            multi.create(this, button);
        });
        
        // Decode Reedem Script
        $('body').on('submit', '#bs-decode-multisig-script', function(e)
        {
            e.preventDefault();
            var button = $(this).find('button[type="submit"]');
            $(button).addClass('loading');
            multi.decode(this, button);
        });
        
        // Verify addresses or public keys are part of the reedem script
        $('body').on('submit', '#bs-verify-multisig-script', function(e)
        {
            e.preventDefault();
            var button = $(this).find('button[type="submit"]');
            $(button).addClass('loading');
            multi.verify(this, button);
        });
        
        // Send transactions
        $('body').on('submit', '#bs-send-multisig-transaction', function(e)
        {
            e.preventDefault();
            var button = $(this).find('button[type="submit"]');
            $(button).addClass('loading');
            multi.send(this, button);
        });
        
        // Used switch
        $('body').on('change', 'select[name="used"]', function(e)
        {
            var used = parseInt($(this).val());
            var list = $('#'+$(this).attr('data-id'));
            var current = $(list).find('input').length;
            if(used != current)
            {
                $(list).html('');
                var contents = '';
                for(key_count = 0; key_count < used; key_count++) 
                {
                    var type = 'st';
                    if(key_count == 1) type = 'nd';
                    else if(key_count == 2) type = 'rd';
                    else if(key_count > 2) type = 'th';
                    contents+= '<input type="text" class="form-control" name="keys['+key_count+']" placeholder="Add the '+(key_count+1)+type+' public key here" autocomplete="off" />';
                }
                $(list).html(contents);
            }
        });
        
        // Required switch
        $('body').on('change', 'select[name="required"]', function(e)
        {
            var required = parseInt($(this).val());
            var list = $('#'+$(this).attr('data-id'));
            var current = $(list).find('input').length;
            if(required != current)
            {
                $(list).html('');
                var contents = '';
                for(key_count = 0; key_count < required; key_count++) 
                {
                    var type = 'st';
                    if(key_count == 1) type = 'nd';
                    else if(key_count == 2) type = 'rd';
                    else if(key_count > 2) type = 'th';
                    contents+= '<input type="text" class="form-control" name="keys['+key_count+']" placeholder="Add the '+(key_count+1)+type+' private key here" autocomplete="off" />';
                }
                $(list).html(contents);
            }
        });
        
        // Add new keys to form
        $('body').on('click', '#bs-add-another-key', function(e)
        {
            e.preventDefault();
            var button = this;
            var list = $('#'+$(button).attr('data-id'));
            var count = $(list).find('input').length;
            var input = '<input type="text" class="form-control" autocomplete="off" name="keys['+count+']" placeholder="Check this key or address is included" />';
            $(list).append(input);
        });
    },
    init: function()
    {
        multi.forms();
        multi.modals();
    },
    modals: function()
    {
        $('.modal').on('hide.bs.modal', function(e) 
        {
            $('.loading').removeClass('loading');
        });
    },
    send: function(form)
    {
        var bs = $.fn.blockstrap;
        var title = 'Error';
        var contents = '<p>No reedem script provided</p>';
        var chain = $(form).find('select[name="chain"]').val();
        var script = $(form).find('textarea[name="script"]').val();
        if(script)
        {
            var address = $(form).find('input[name="address"]').val();
            var amount = parseFloat($(form).find('input[name="amount"]').val());
            if(address && amount > 0)
            {
                var keys = [];
                $(form).find('.bs-key-list input').each(function(i)
                {
                    var input = this;
                    if($(input).val()) keys.push($(input).val());
                });
                try
                {
                    var redeem_script = bitcoin.Script.fromHex(script);
                    var script_pub_key = bitcoin.scripts.scriptHashOutput(redeem_script.getHash());
                    var lib = $.fn.blockstrap.settings.blockchains[chain].lib;
                    var multisig_address = bitcoin.Address.fromOutputScript(script_pub_key, bitcoin.networks[lib]).toString();
                    bs.api.unspents(multisig_address, chain, function(unspents)
                    {
                        if($.isArray(unspents) && blockstrap_functions.array_length(unspents) > 0)
                        {
                            var total = 0;
                            var inputs = [];
                            var amount_to_send = parseFloat(amount) * 100000000;
                            var fee = $.fn.blockstrap.settings.blockchains[chain].fee * 100000000;

                            $.each(unspents, function(k, unspent)
                            {
                                if(total < amount_to_send + fee)
                                {
                                    inputs.push({
                                        txid: unspent.txid,
                                        n: unspent.index,
                                        script: unspent.script,
                                        value: unspent.value,
                                    });
                                    total = total + unspent.value;
                                }
                            });
                            
                            if(total >= amount_to_send + fee)
                            {

                                var outputs = [{
                                    address: address,
                                    value: amount_to_send
                                }];

                                var raw_tx = $.fn.blockstrap.blockchains.raw(
                                    multisig_address,
                                    keys,
                                    inputs,
                                    outputs,
                                    fee,
                                    amount_to_send,
                                    false,
                                    true,
                                    script
                                );
                                
                                $.fn.blockstrap.api.relay(raw_tx, chain, function(results)
                                {
                                    if(typeof results.txid != 'undefined' && results.txid)
                                    {
                                        title = 'Success';
                                        contents = '<p>Transaction successfully sent to <a href="http://api.blockstrap.com/v0/'+chain+'/address/id/'+address+'" target="_blank">'+address+'</a></p>';
                                        contents+= '<p>TXID: <a href="http://api.blockstrap.com/v0/'+chain+'/transaction/id/'+results.txid+'" target="_blank">'+results.txid+'</a></p>';
                                        bs.core.modal(title, contents);
                                    }
                                    else
                                    {
                                        contents = '<p>Unable to relay transaction</p>';
                                        bs.core.modal(title, contents);
                                    }
                                });
                            }
                            else
                            {
                                contents = '<p>The available balance is not enough to make the transaction</p>';
                                bs.core.modal(title, contents);
                            }
                        }
                        else
                        {
                            contents = '<p>No available unspents for spending</p>';
                            bs.core.modal(title, contents);
                        }
                    });
                }
                catch(error)
                {
                    contents = '<p>Invalid private keys</p>';
                    bs.core.modal(title, contents);
                }
            }
            else
            {
                contents = '<p>Address to send to and amount to send are required</p>';
                bs.core.modal(title, contents);
            }
        }
        else
        {
            bs.core.modal(title, contents);
        }
    },
    test: function(hash, chain)
    {
        if(typeof chain == 'undefined' || !chain) chain = 'doget';
        if(typeof hash == 'undefined' || !hash) hash = 'BS_MULTI_TEST';
        var keys = $.fn.blockstrap.multisig.generate(hash, chain);
        console.log('keys', keys);
        var key = keys.pop();
        console.log('generated address = '+key.address);
        var deterministic_keys = keys;
        var address_to_send_tx_too = 'ncq5H5EdCwmGVtQtquk2TKyXDTNApoDpwq';
        console.log('doget qt return address = '+address_to_send_tx_too);
    },
    verify: function(form)
    {
        var bs = $.fn.blockstrap;
        var title = 'Error';
        var contents = 'This is not a valid reedem script';
        var script = $(form).find('textarea[name="script"]').val();
        var chain = $(form).find('select[name="chain"]').val();
        var lib = bs.settings.blockchains[chain].lib;
        var blockchain_obj = bitcoin.networks[lib];
        var keys = [];
        try
        {
            var input_keys = [];
            var keys = $.fn.blockstrap.multisig.decode(script, chain);
            $('#bs-verify-keys').find('input').each(function(i, obj)
            {
                var key = $(this).val();
                if(key)
                {
                    input_keys.push(key);
                    title = 'Script Verification';
                    contents = '<p>Results of verification below:</p>';
                }
            });
            if(!script)
            {
                contents = '<p>No reedem script provided</p>';
                bs.core.modal(title, contents);
            }
            else if(blockstrap_functions.array_length(input_keys) < 1)
            {
                contents = '<p>No addresses or keys to verify</p>';
                bs.core.modal(title, contents);
            }
            else
            {
                $.each(input_keys, function(k, key)
                {
                    var this_contents = false;
                    $.each(keys, function(i, this_key)
                    {
                        if(this_key.address == key || key == this_key.key)
                        {
                            contents+= '<p><span class="alert alert-success alert-block">'+key+' is included in the script</script></p>';
                            this_contents = true;
                        }
                    });
                    if(!this_contents)
                    {
                        contents+= '<p><span class="alert alert-danger alert-block">'+key+' is not included</span></p>';
                    }
                });
                bs.core.modal(title, contents);
            }
        }
        catch(error)
        {
            bs.core.modal(title, contents);
        }
    }
};

$(document).ready(function()
{
    multi.init();
});