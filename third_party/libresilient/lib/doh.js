//
// implementing some helper functions for DNS-over-HTTPS
//

/**
 * retrieving the alternative endpoints list from DNS TXT records
 * using a DNS-over-HTTPS binary DNS wire format endpoint
 * 
 * returns an array of strings, each being a valid endpoint,
 * in the form of:
 * scheme://example.org[/optional/path]
 * 
 * for an explanation of what the heck is going on here, see:
 * https://courses.cs.duke.edu/fall16/compsci356/DNS/DNS-primer.pdf
 * 
 * @param domain (string)   domain name to resolve TXT records for
 * @param config (object)   config object with fields: dohProvider, dohMethod, dohMediaType
 * @param log    (function) logging function to use (optional)
 */
window.resolveEndpointsBinary = async (domain, config, log=()=>{} ) => {
    
    // encoder and decoder
    let enc = new TextEncoder();
    let dec = new TextDecoder('utf8');
    
    // then we need an Uint8Array for the whole thing
    // 
    // how large? glad you asked!
    // - header part is 12 bytes
    // - question part is (domain.length + 2) + 4 bytes
    //
    // why? even more glad you asked!
    // 
    // qname part is the part that will contain the name we are trying to resolve.
    // this means all the labels, without the dots.
    // each label will be preceeded by one-byte field containing the length of the label
    // after all labels are included, a one-byte null terminator follows.
    // 
    // so, for "_dnslink.example.org" (length: 20 bytes) we get:
    // [len:8]_dnslink[len:7]example[len:3]org[null] (length: 22 bytes)
    let qbuf = new Uint8Array(12 + domain.length + 6)
    
    // let's build ourselves a header
    qbuf.set([
        
        // ID, 16-bit — request identifier
        Math.floor(Math.random() * 256), Math.floor(Math.random() * 256),
        
        // 16 bits of flags
        // 
        //,-------------- 1-bit QR header field, 0 means "query"
        //| ,------------ 4-bit OPCODE header field, we want 0 ("standard query")
        //| |  ,--------- 1-bit AA header field, only relevant in response (1 means the response is authoritative)
        //| |  |,-------- 1-bit TC header field, we want 0 signifying the message was not truncated
        //| |  ||,------- 1-bit RD header field, we want 1 signifying we want recursive resolution
        //| |  |||
        //| |  |||    ,------- 1-bit RA header field, only relevant in response (1 means recursion is available)
        //| |  |||    | ,----- 3-bit Z header field, reserved for future use, always 0
        //| |  |||    | |   ,- 4-bit RCODE header field, to be set to 0, and inspected in response for error codes
        //| |\ |||    | |  /|
        //|/  \|||    |/ \/  \
        0b00000001, 0b00000000,
        
        // QDCOUNT, 16-bit — number of questions (we only have one)
        0x00, 0x01,
        
        // ANCOUNT, 16-bit — we are not providing answers, only asking questions
        0x00, 0x00,
        
        // NSCOUNT, 16-bit — we are not providing any nameserver info
        0x00, 0x00,
        
        // ARCOUNT, 16-bit — no additional records from our side!
        0x00, 0x00
    ])
    
    // let's build ourselves a QNAME!
    let qbufpos = 12 // starting at byte 12, just as the header ends
    domain
        .split('.')
        .forEach(
            (label)=>{
                // set the byte of the buffer at the current position to the length of the label
                qbuf[qbufpos] = label.length 
                // set the encoded label starting from the following byte
                qbuf.set(enc.encode(label), qbufpos + 1)
                // increment the position by the length of the label plus 1 byte
                qbufpos += label.length + 1
            })
        
    // in qbufpos at this point we have the position of the byte
    // directly following the last letter in the last label
    // we need a null byte there to signify end of QNAME
    qbuf[qbufpos] = 0x00
    qbufpos += 1
    
    // let's finish it all off
    qbuf.set([
        
        // QTYPE, 160-bit — we want TXT records, which is 16 decimal
        // https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-4
        0x00, 0x10,
    
        // QCLASS, 16-bit — we want Internet (IN)
        // https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-2
        0x00, 0x01
    ], qbufpos)
    
    // request data
    let request_data = {
        url: config.dohProvider,
        options: {
            // TODO: we need to find a way to make "no-cors" requests
            //mode: "no-cors",
            method: config.dohMethod,
            headers: {
                accept: config.dohMediaType
            }
        }
    }
    
    // GET or POST?
    // https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/make-api-requests/dns-wireformat/
    if (config.dohMethod === "POST") {
        // binary data in POST body, easy peasy
        request_data.options.body = qbuf;
        request_data.options.headers["content-length"] = qbuf.length.toString()
        request_data.options.headers["content-type"]   = config.dohMediaType
        
    } else if (config.dohMethod === "GET") {
        // we need base64-encoded data, since we're putting it the URL directly
        // https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
        request_data.url += "?dns=" + btoa(String.fromCodePoint(...qbuf));
        
    } else {
        // that's not right
        throw new Error('dohMethod can only be "GET" or "POST"; got: ' + config.dohMethod)
    }
    
    // make the request
    let response = await fetch(request_data.url, request_data.options)
    
    // did we get application/dns-message?
    if (response.headers.get("content-type") !== config.dohMediaType) {
        throw new Error(`Response Content-Type should be: ${config.dohMediaType}; is: ${response.headers.get("content-type")}.`)
    }
    
    // let's get the actual response
    let rbuf = new Uint8Array(await response.arrayBuffer())
    
    // the answer cannot be shorter than the question
    if (rbuf.length < qbuf.length) {
        throw new Error('Invalid response: response cannot be shorter than request!')
    }
    
    // first two bytes have to be the ID, so identical to qbuf's first two bytes
    if ( (rbuf[0] !== qbuf[0]) || (rbuf[1] !== qbuf[1]) ) {
        throw new Error('Response ID does not match Request ID!')
    }
    
    // is this a response? QR bit needs to be 1
    if ( (rbuf[2] & 0b10000000) != 0b10000000) {
        throw new Error('Invalid response: QR bit does not indicate a response!')
    }
    
    // is the OPCODE sane? it needs to be 0b0000
    if ( (rbuf[2] & 0b01111000) != 0b00000000) {
        throw new Error('Invalid response: OPCODE contains an unexpected value (should be zero)!')
    }
    
    // there's no good reason for us to get a truncated response
    if ( (rbuf[2] & 0b00000010) == 0b00000010) {
        throw new Error('Invalid response: Got a truncated response. There is no reason for it, and we cannot handle it.')
    }
    
    // recursive resolution was requested — is that reflected?
    if ( (rbuf[2] & 0b0000001) != 0b00000001) {
        throw new Error('Invalid response: Recursive resolution was requested but this is not reflected in response.')
    }
    
    // 3-bit Z field is "reserverved for future use" and should be zero
    if ( (rbuf[3] & 0b01110000) != 0b00000000) {
        throw new Error("Invalid response: Response's Z field is not zeroed out!")
    }
    
    // 4-bit RCODE field should be zero, anything else indicates errors
    if ( (rbuf[3] & 0b00001111) != 0b00000000) {
        let rcode = (rbuf[3] & 0b00001111)
        if (rcode == 1) {
            throw new Error("Response's RCODE field indicates a format error!")
        }
        if (rcode == 2) {
            throw new Error("Response's RCODE field indicates a server failure!")
        }
        if (rcode == 3) {
            throw new Error("Response's RCODE field indicates a the name does not exist!")
        }
        if (rcode == 4) {
            throw new Error("Response's RCODE field indicates a not implemented error!")
        }
        if (rcode == 5) {
            throw new Error("Response's RCODE field indicates the request was refused!")
        }
        throw new Error(`Response's RCODE field indicates an error (code: ${rcode})!`)
    }
    
    // we only asked one question
    if ( (rbuf[4] != 0) || (rbuf[5] != 1) ) {
        throw new Error("Response's QDCOUNT is different than request's QDCOUNT (should be 1)!")
    }
    
    // how many resource records did we get in the response?
    let ancount = (rbuf[6] << 8) + rbuf[7];
    if (ancount < 1) {
        throw new Error("Response's ANCOUNT indicates no resource records received in response!")
    } else {
        log("number of resource records received: " + ancount)
    }
    
    // we are ignoring NSCOUNT and ARCOUNT 16-bit fields (rbuf[8] through rbuf[11]),
    // and moving on to question section
    let rbufpos = 12
    
    // let's see if the question section in the response
    // matches the question section in the request
    //
    // header is the same size in request and response: 12 bytes
    // 
    // qbufpos indicates the end of the QNAME section of the request
    // this is followed by four bytes: two for TYPE and two for CLASS
    // 
    // these (QNAME, QTYPE, QCLASS) should all be byte-for-byte equal
    // in both request and response
    while (rbufpos < qbufpos + 4) {
        if (rbuf[rbufpos] != qbuf[rbufpos]) {
            throw new Error("Invalid response: QNAME, QTYPE, or QCLASS do not match between request and response.")
        }
        rbufpos += 1
    }
    
    // let's make some space for answers
    // this is going to be an array of string
    let answers = []

    // consume the response buffer byte by byte
    while (rbufpos < rbuf.length) {
        
        // we are not ignoring answers by default
        let ignore_answer = false
        
        // at this point we should have our NAME (same as QNAME) in the response
        // if it starts with 0x11nn, it's a pointer to a QNAME/NAME,
        // and the rest of the two bytes is the offset from the start of the response
        
        // is this a pointer or a NAME?
        if ( (rbuf[rbufpos] & 0b11000000) == 0b11000000 ) {
            // a pointer! we should expect the rest of the two bytes
            // to be an offset from the start of the response
            // and it only makes sense here for the offset to be equal
            // to 12 — the first byte after the header
            if ( ((rbuf[rbufpos] & 0b00111111) << 8) + rbuf[rbufpos+1] != 12) {
                throw new Error(`Invalid response: unexpected name pointer offset ${((rbuf[rbufpos] & 0b00111111) << 8) + rbuf[rbufpos+1]} (expected: 12)`)
            }
            rbufpos += 2;
            
        } else if ( (rbuf[rbufpos] & 0b11000000) == 0b00000000 ) {
            // so we get a full name, that should be identical
            // to QNAME from the question section — length of which is (qbufpos - 12) bytes,
            // when accounted for the header
            for (let i=0; i < (qbufpos - 12); i++) {
                if (rbuf[rbufpos + i] != qbuf[i + 12]) {
                    throw new Error("Invalid response: NAME in an answer does not match the QNAME from the request.")
                }
            }
            rbufpos += (qbufpos - 12)
        
        // this should never happen
        } else {
            throw new Error('Invalid response: answer\'s NAME starts with something else than 0b11 or 0b00.')
        }
        
        // two bytes of TYPE; we are asking for TXT, which is 16
        if ( ((rbuf[rbufpos] << 8) + rbuf[rbufpos+1]) != 16) {
            // we don't care about any other type
            // but we can't just bail, we need to verify the validity of the whole answer section
            ignore_answer = true
            log("Not a TXT record, ignoring.")
        }
        rbufpos += 2
        
        // two bytes of CLASS; we are only interested in IN ("Internet") class, which is 1
        if ( ((rbuf[rbufpos] << 8) + rbuf[rbufpos+1]) != 1) {
            throw new Error("Invalid response: unexpected CLASS: " + ((rbuf[rbufpos] << 8) + rbuf[rbufpos+1]))
        }
        rbufpos += 2
        
        // four bytes of TTL.!
        let ttl = ((rbuf[rbufpos] << 24) + (rbuf[rbufpos+1] << 16) + (rbuf[rbufpos+2] << 8) + rbuf[rbufpos+3])
        rbufpos += 4
        
        // 16-bit length of the RDATA field. that we definitely care about!
        let rdlength = ((rbuf[rbufpos] << 8) + rbuf[rbufpos+1])
        // "An empty TXT record containing zero strings is not allowed [RFC1035]."
        if (rdlength < 1) {
            throw new Error("Invalid response: RDLENGTH is zero")
        }
        rbufpos += 2
        
        // are we interested in this answer at all?
        if (ignore_answer) {
            // skip!
            rbufpos += rdlength;
            continue;
        }
        
        // "The format of each constituent string within the DNS TXT record is a
        //  single length byte, followed by 0-255 bytes of text data."
        // https://www.ietf.org/rfc/rfc6763.txt
        // 
        // in other words we have the length of the TXT record itself specified again within RDATA
        // this obviously should be 1 less than RDLENGTH
        // 
        // TODO: we are assuming here that the RDATA only contains one string;
        // TODO: *technically* RDATA *can* contain multiple strings for TXT RRs, but that seems to not be used much?
        if (rdlength != rbuf[rbufpos] + 1) {
            throw new Error("Invalid response: RDLENGTH does not match TXT record length")
        }
        rbufpos += 1
        
        // we are interested! okay!
        answers.push(dec.decode(rbuf.slice(rbufpos, rbufpos + rdlength - 1)))
        log(`relevant answer received: '${answers[answers.length - 1]}' (TTL: ${ttl})`)
        rbufpos += rdlength - 1;
        
        // did we get all the answers we expected based on ANCOUNT?
        if (ancount <= answers.length) {
            // great, we can ignore the rest of the response packet
            log(`got all ${ancount} expected answers.`)
            break
        }
    }
    
    // this should be an array of strings
    return answers;
}

/**
 * retrieving the alternative endpoints list from DNS TXT records
 * using a DNS-over-HTTPS JSON endpoint
 * 
 * returns an array of strings, one per each TXT record
 * 
 * @param domain (string)   domain name to resolve TXT records for
 * @param config (object)   config object with fields: dohProvider, dohMethod, dohMediaType
 */
window.resolveEndpointsJSON = async (domain, config) => {
    // pretty self-explanatory:
    // DoH provider, domain, TXT type, pretty please
    var query = `${config.dohProvider}?name=${domain}&type=TXT`
    
    // make the query, get the response
    var response = await fetch(
                            query, {
                                // TODO: we need to find a way to make "no-cors" requests
                                //mode: "no-cors",
                                headers: {
                                    'accept': 'application/json',
                                }
                            })
                        // this will throw an error if the response fails to parse as JSON
                        .then(r=>r.json())
                        
    // we need an object here
    // we could get a "JSON" that is just a string, as long as it is in quote-marks, apparently
    if (typeof response !== 'object') {
        throw new Error('Response is not a valid JSON')
    }
    
    // only Status == 0 is acceptable
    // https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-6
    if (!('Status' in response) || response.Status != 0) {
        throw new Error(`DNS request failure, status code: ${response.Status}`)
    }
    
    // we also do need the Answer section please
    if (!('Answer' in response) || (typeof response.Answer !== 'object') || (!Array.isArray(response.Answer))) {
        throw new Error(`DNS response did not contain a valid Answer section`)
    }
    
    // only get TXT records, and extract the data from them
    response = response
                .Answer
                .filter(r => r.type == 16)
                .map(r => r.data);
    
    // did we get anything of value? anything at all?
    if (response.length < 1) {
        throw new Error(`Answer section of the DNS response did not contain any TXT records`)
    }
    
    // this should be an array of strings, containing the TXT records
    return response
}
